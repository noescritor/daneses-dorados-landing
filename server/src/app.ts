import { Hono, type Context, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import QRCode from "qrcode";
import { z } from "zod";
import type { Config } from "./config";
import { type DB, all, get } from "./db";
import type { Mailer } from "./mailer";
import type { MercadoPagoClient } from "./mp";
import {
  type EventRow,
  type TierRow,
  OrderError,
  type OrderErrorCode,
  cancelPendingOrder,
  claimWebhookEvent,
  completeWebhookEvent,
  createOrder,
  getOrder,
  setPreference,
} from "./orders";
import { type PaymentDeps, handlePaymentNotification, reconcileOrder } from "./payments";
import { clientIp, pinMatches, rateLimit, signSession, verifySession } from "./security";
import { parseSecrets, verifyWebhookSignatureAny } from "./signature";
import { TICKET_CODE_PATTERN, getCatalog, getTicketView, scanTicket, ticketsForOrder } from "./tickets";

export interface AppDeps {
  db: DB;
  cfg: Config;
  mp: MercadoPagoClient | null;
  mailer: Mailer;
  now?: () => Date;
  log?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  serveFrontend?: boolean;
}

const RECONCILE_WINDOW_MS = 48 * 60 * 60 * 1000;
const RECONCILE_MIN_INTERVAL_MS = 5000;

const checkoutSchema = z.object({
  tierId: z.string().min(1).max(40),
  eventId: z.string().min(1).max(80).nullish(),
  quantity: z.number().int().min(1).max(100),
  buyerName: z.string().trim().min(2).max(100),
  buyerEmail: z.string().trim().max(200).pipe(z.email()),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
});

const scanSchema = z.object({ code: z.string().min(1).max(300), eventId: z.string().min(1).max(80) });
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const ORDER_ERROR_STATUS: Record<OrderErrorCode, 400 | 409> = {
  invalid_tier: 400,
  invalid_event: 400,
  invalid_quantity: 400,
  not_on_sale: 409,
  sold_out: 409,
  idempotency_conflict: 409,
};

export function createApp(deps: AppDeps): Hono {
  const { db, cfg, mp, mailer } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((message, meta) => console.error(message, meta ?? ""));
  const paymentDeps: PaymentDeps = { db, mp: mp as MercadoPagoClient, mailer, cfg, now, log };
  const info = deps.info ?? ((message, meta) => console.log(message, meta ?? ""));
  const inflightPreferences = new Map<string, Promise<string>>();
  const lastReconcile = new Map<string, number>();

  const app = new Hono();
  app.use("*", secureHeaders());
  app.use("/api/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });
  app.use("/api/*", bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "payload_too_large" }, 413) }));
  app.onError((err, c) => {
    log("Error no controlado", { path: c.req.path, error: String(err) });
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/catalog", (c) =>
    c.json({
      ...getCatalog(db, now()),
      limits: { maxQuantity: cfg.MAX_QTY_PER_ORDER, reservationMinutes: cfg.RESERVATION_MINUTES },
    }),
  );

  async function ensurePreference(orderId: string): Promise<string> {
    const order = getOrder(db, orderId)!;
    if (order.mp_init_point) return order.mp_init_point;
    const pending = inflightPreferences.get(orderId);
    if (pending) return pending;

    const task = (async () => {
      const tier = get<TierRow>(db, "SELECT * FROM tiers WHERE id = ?", order.tier_id)!;
      const event = order.event_id ? get<EventRow>(db, "SELECT * FROM events WHERE id = ?", order.event_id) : undefined;
      const preference = await mp!.createPreference({
        orderId: order.id,
        tierId: tier.id,
        title: event ? `Boleto ${tier.name} · Daneses vs ${event.rival}` : tier.name,
        quantity: order.quantity,
        unitPriceCents: order.unit_price_cents,
        buyerEmail: order.buyer_email,
        buyerName: order.buyer_name,
        baseUrl: cfg.PUBLIC_BASE_URL,
        now: now(),
        expiresAt: new Date(order.reserved_until),
      });
      setPreference(db, order.id, preference.id, preference.initPoint);
      return preference.initPoint;
    })();
    inflightPreferences.set(orderId, task);
    try {
      return await task;
    } finally {
      inflightPreferences.delete(orderId);
    }
  }

  app.post("/api/checkout", rateLimit({ windowMs: 60_000, max: 10 }), async (c) => {
    if (!mp) return c.json({ error: "payments_not_configured" }, 503);
    const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const input = parsed.data;

    let order;
    try {
      order = createOrder(
        db,
        { now: now(), reservationMinutes: cfg.RESERVATION_MINUTES, maxQuantity: cfg.MAX_QTY_PER_ORDER },
        {
          tierId: input.tierId,
          eventId: input.eventId ?? null,
          quantity: input.quantity,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail.toLowerCase(),
          idempotencyKey: input.idempotencyKey,
        },
      );
    } catch (err) {
      if (err instanceof OrderError) return c.json({ error: err.code }, ORDER_ERROR_STATUS[err.code]);
      throw err;
    }
    if (order.status !== "pending") return c.json({ error: "order_not_pending", status: order.status }, 409);

    try {
      const initPoint = await ensurePreference(order.id);
      return c.json({ orderId: order.id, initPoint, reservedUntil: order.reserved_until });
    } catch (err) {
      log("No se pudo crear la preferencia de pago", { orderId: order.id, error: String(err) });
      cancelPendingOrder(db, order.id, "failed");
      return c.json({ error: "payment_provider_error" }, 502);
    }
  });

  app.post("/api/webhooks/mercadopago", async (c) => {
    const secrets = parseSecrets(cfg.MP_WEBHOOK_SECRET);
    if (secrets.length === 0 || !mp) return c.json({ error: "not_configured" }, 503);
    const dataId = c.req.query("data.id");
    const requestId = c.req.header("x-request-id");
    const signature = c.req.header("x-signature");
    if (!verifyWebhookSignatureAny({ xSignature: signature, xRequestId: requestId, dataId }, secrets)) {
      log("Webhook rechazado: firma inválida (la clave de MP_WEBHOOK_SECRET no coincide; el panel tiene una clave por pestaña, prueba y productivo)", {
        dataId,
        tieneFirma: Boolean(signature),
        tieneRequestId: Boolean(requestId),
        clavesConfiguradas: secrets.length,
      });
      return c.json({ error: "invalid_signature" }, 401);
    }

    const body = (await c.req.json().catch(() => ({}))) as { type?: string };
    const type = c.req.query("type") ?? body.type;
    if (type !== "payment") return c.json({ ok: true, ignored: true });
    if (!dataId || !/^\d{1,20}$/.test(dataId)) return c.json({ error: "invalid_request" }, 400);

    const key = `${dataId}:${requestId ?? signature}`;
    if (claimWebhookEvent(db, key, now()) === "done") return c.json({ ok: true, duplicate: true });
    try {
      const result = await handlePaymentNotification(paymentDeps, dataId);
      completeWebhookEvent(db, key, now());
      info("Webhook de pago procesado", { dataId, result });
      return c.json({ ok: true, result });
    } catch (err) {
      log("Falló el procesamiento del webhook", { dataId, error: String(err) });
      return c.json({ error: "processing_failed" }, 500);
    }
  });

  app.get("/api/orders/:id", async (c) => {
    const id = c.req.param("id");
    let order = ORDER_ID.test(id) ? getOrder(db, id) : undefined;
    if (!order) return c.json({ error: "not_found" }, 404);

    const open = order.status === "pending" || order.status === "expired";
    const recent = now().getTime() - new Date(order.created_at).getTime() < RECONCILE_WINDOW_MS;
    if (mp && open && recent && now().getTime() - (lastReconcile.get(id) ?? 0) >= RECONCILE_MIN_INTERVAL_MS) {
      if (lastReconcile.size > 1000) lastReconcile.clear();
      lastReconcile.set(id, now().getTime());
      try {
        if (await reconcileOrder(paymentDeps, id)) info("Orden conciliada con Mercado Pago", { orderId: id });
        order = getOrder(db, id)!;
      } catch (err) {
        log("No se pudo conciliar la orden con Mercado Pago", { orderId: id, error: String(err) });
      }
    }
    const tier = get<TierRow>(db, "SELECT * FROM tiers WHERE id = ?", order.tier_id)!;
    const event = order.event_id ? get<EventRow>(db, "SELECT * FROM events WHERE id = ?", order.event_id) : undefined;
    return c.json({
      id: order.id,
      status: order.status,
      tierName: tier.name,
      quantity: order.quantity,
      totalCents: order.total_cents,
      reservedUntil: order.reserved_until,
      event: event ? { rival: event.rival, venue: event.venue, startsAt: event.starts_at } : null,
      tickets: order.status === "paid" ? ticketsForOrder(db, order.id).map((t) => ({ code: t.code })) : [],
    });
  });

  app.get("/api/tickets/:code", (c) => {
    const code = c.req.param("code");
    const view = TICKET_CODE_PATTERN.test(code) ? getTicketView(db, code) : undefined;
    return view ? c.json(view) : c.json({ error: "not_found" }, 404);
  });

  app.get("/api/tickets/:code/qr.svg", async (c) => {
    const code = c.req.param("code");
    if (!TICKET_CODE_PATTERN.test(code) || !getTicketView(db, code)) return c.json({ error: "not_found" }, 404);
    const svg = await QRCode.toString(`${cfg.PUBLIC_BASE_URL}/t/${code}`, { type: "svg", margin: 1, width: 600, errorCorrectionLevel: "M" });
    return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
  });

  const requireStaff: MiddlewareHandler = async (c, next) => {
    if (!verifySession(cfg.SESSION_SECRET, getCookie(c, "staff"), now())) return c.json({ error: "unauthorized" }, 401);
    await next();
  };

  app.post("/api/staff/login", rateLimit({ windowMs: 60_000, max: 5 }), async (c) => {
    if (!cfg.STAFF_PIN) return c.json({ error: "not_configured" }, 503);
    const body = z.object({ pin: z.string().min(1).max(100) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success || !pinMatches(body.data.pin, cfg.STAFF_PIN)) return c.json({ error: "invalid_pin" }, 401);
    setCookie(c, "staff", signSession(cfg.SESSION_SECRET, now()), {
      httpOnly: true,
      sameSite: "Strict",
      secure: cfg.PUBLIC_BASE_URL.startsWith("https://"),
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return c.json({ ok: true });
  });

  app.post("/api/staff/logout", (c) => {
    deleteCookie(c, "staff", { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/api/staff/events", requireStaff, (c) =>
    c.json({
      events: all<EventRow>(db, "SELECT * FROM events WHERE is_home = 1 ORDER BY starts_at").map((e) => ({
        id: e.id,
        rival: e.rival,
        startsAt: e.starts_at,
        stage: e.stage,
      })),
    }),
  );

  app.post("/api/staff/scan", requireStaff, rateLimit({ windowMs: 60_000, max: 120 }), async (c) => {
    const body = scanSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request" }, 400);
    return c.json(scanTicket(db, { code: body.data.code, eventId: body.data.eventId, scannedBy: clientIp(c) }, now()));
  });

  app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

  if (deps.serveFrontend !== false) {
    // El HTML siempre se revalida (así un deploy nuevo se ve de inmediato); los archivos de
    // /assets llevan hash en el nombre y nunca cambian; el resto (fotos, logos) se cachea poco.
    const onFound = (path: string, c: Context) => {
      const cache = path.endsWith(".html")
        ? "no-cache"
        : /[\\/]assets[\\/]/.test(path)
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600";
      c.header("Cache-Control", cache);
    };
    app.use("/*", serveStatic({ root: cfg.STATIC_DIR, onFound }));
    app.get("*", serveStatic({ path: `${cfg.STATIC_DIR}/index.html`, onFound }));
  }

  return app;
}
