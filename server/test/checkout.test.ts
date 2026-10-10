import { describe, expect, it } from "vitest";
import { expirePendingOrders } from "../src/orders";
import { FIRST_EVENT, SECOND_EVENT, catalog, checkout, makeEnv, newKey, postJson } from "./helpers";

describe("catálogo", () => {
  it("publica los precios oficiales y solo partidos en casa", async () => {
    const { app } = makeEnv();
    const c = await catalog(app);
    const price = (id: string) => c.tiers.find((t) => t.id === id)?.priceCents;
    expect(price("general")).toBe(15000);
    expect(price("vip")).toBe(50000);
    expect(price("pass_general")).toBe(50000);
    expect(price("pass_vip")).toBe(166700);
    expect(c.events.map((e) => e.id)).toEqual([FIRST_EVENT, SECOND_EVENT, "2026-11-14-angeles", "2026-11-21-tapatios"]);
  });
});

describe("checkout", () => {
  it("calcula precio y cantidad en el servidor e ignora lo que mande el cliente", async () => {
    const { app, mp, db } = makeEnv();
    const { res, json } = await checkout(app, { quantity: 2, unitPrice: 1, totalCents: 1, price: 0.01, amount: 1 });
    expect(res.status).toBe(200);
    expect(json.initPoint).toMatch(/^https:\/\/mp\.test\//);
    expect(mp.preferences).toHaveLength(1);
    expect(mp.preferences[0].unitPriceCents).toBe(15000);
    expect(mp.preferences[0].quantity).toBe(2);
    const order = db.prepare("SELECT total_cents FROM orders WHERE id = ?").get(json.orderId) as { total_cents: number };
    expect(order.total_cents).toBe(30000);
  });

  it("envía a Mercado Pago la expiración alineada con la reserva y excluye pagos offline", async () => {
    const { app, mp, clock } = makeEnv();
    const { json } = await checkout(app);
    const pref = mp.preferences[0];
    expect(pref.expiresAt.getTime() - clock.now.getTime()).toBe(15 * 60_000);
    expect(new Date(json.reservedUntil).getTime()).toBe(pref.expiresAt.getTime());
    expect(pref.orderId).toBe(json.orderId);
  });

  it("aparta el cupo de forma inmediata", async () => {
    const { app } = makeEnv();
    await checkout(app, { tierId: "general", quantity: 3 });
    const c = await catalog(app);
    expect(c.events.find((e) => e.id === FIRST_EVENT)!.available.general).toBe(2);
    expect(c.events.find((e) => e.id === SECOND_EVENT)!.available.general).toBe(5);
  });

  it("no vende más de la capacidad", async () => {
    const { app } = makeEnv();
    expect((await checkout(app, { tierId: "vip", quantity: 2 })).res.status).toBe(200);
    const over = await checkout(app, { tierId: "vip", quantity: 1 });
    expect(over.res.status).toBe(409);
    expect(over.json.error).toBe("sold_out");
  });

  it("con compras simultáneas por el último lugar solo una gana", async () => {
    const { app } = makeEnv();
    await checkout(app, { tierId: "vip", quantity: 1 });
    const results = await Promise.all([1, 2, 3].map(() => checkout(app, { tierId: "vip", quantity: 1 })));
    expect(results.filter((r) => r.res.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.res.status === 409)).toHaveLength(2);
  });

  it("rechaza cantidades fuera de rango y datos inválidos", async () => {
    const { app } = makeEnv();
    expect((await checkout(app, { quantity: 7 })).json.error).toBe("invalid_quantity");
    expect((await checkout(app, { quantity: 0 })).res.status).toBe(400);
    expect((await checkout(app, { buyerEmail: "no-es-correo" })).res.status).toBe(400);
    expect((await checkout(app, { tierId: "platino" })).json.error).toBe("invalid_tier");
    expect((await checkout(app, { tierId: "general", eventId: null })).json.error).toBe("invalid_event");
    expect((await checkout(app, { tierId: "pass_vip", eventId: FIRST_EVENT })).json.error).toBe("invalid_event");
  });

  it("no vende partidos que ya empezaron", async () => {
    const { app, clock } = makeEnv();
    clock.now = new Date("2026-10-25T00:01:00.000Z");
    const { res, json } = await checkout(app, { tierId: "general", eventId: FIRST_EVENT });
    expect(res.status).toBe(409);
    expect(json.error).toBe("not_on_sale");
  });

  it("es idempotente: la misma llave no duplica orden, reserva ni preferencia", async () => {
    const { app, mp } = makeEnv();
    const key = newKey();
    const a = await checkout(app, { quantity: 2, idempotencyKey: key });
    const b = await checkout(app, { quantity: 2, idempotencyKey: key });
    expect(b.json.orderId).toBe(a.json.orderId);
    expect(b.json.initPoint).toBe(a.json.initPoint);
    expect(mp.preferences).toHaveLength(1);
    const c = await catalog(app);
    expect(c.events.find((e) => e.id === FIRST_EVENT)!.available.general).toBe(3);
  });

  it("dos envíos simultáneos con la misma llave crean una sola preferencia", async () => {
    const { app, mp } = makeEnv();
    const key = newKey();
    const [a, b] = await Promise.all([checkout(app, { idempotencyKey: key }), checkout(app, { idempotencyKey: key })]);
    expect(a.json.orderId).toBe(b.json.orderId);
    expect(mp.preferences).toHaveLength(1);
  });

  it("rechaza reutilizar una llave con datos distintos", async () => {
    const { app } = makeEnv();
    const key = newKey();
    await checkout(app, { quantity: 1, idempotencyKey: key });
    const other = await checkout(app, { quantity: 2, idempotencyKey: key });
    expect(other.res.status).toBe(409);
    expect(other.json.error).toBe("idempotency_conflict");
  });

  it("el pase aparta un lugar en todos los partidos en casa", async () => {
    const { app } = makeEnv();
    await checkout(app, { tierId: "pass_general", quantity: 1 });
    const c = await catalog(app);
    for (const ev of c.events) expect(ev.available.general).toBe(4);
    expect(c.passAvailable.general).toBe(4);
    expect(c.passAvailable.vip).toBe(2);
  });

  it("libera la reserva cuando expira", async () => {
    const { app, db, clock } = makeEnv();
    const { json } = await checkout(app, { quantity: 4 });
    clock.now = new Date(clock.now.getTime() + 16 * 60_000);
    expect(expirePendingOrders(db, clock.now)).toBe(1);
    const status = db.prepare("SELECT status FROM orders WHERE id = ?").get(json.orderId) as { status: string };
    expect(status.status).toBe("expired");
    const c = await catalog(app);
    expect(c.events.find((e) => e.id === FIRST_EVENT)!.available.general).toBe(5);
    expect(expirePendingOrders(db, clock.now)).toBe(0);
  });

  it("libera la reserva si Mercado Pago falla al crear la preferencia", async () => {
    const { app, mp } = makeEnv();
    mp.state.failPreference = true;
    const { res, json } = await checkout(app, { quantity: 2 });
    expect(res.status).toBe(502);
    expect(json.error).toBe("payment_provider_error");
    const c = await catalog(app);
    expect(c.events.find((e) => e.id === FIRST_EVENT)!.available.general).toBe(5);
  });

  it("responde 503 si no hay credenciales de Mercado Pago", async () => {
    const env = makeEnv();
    const { createApp } = await import("../src/app");
    const app = createApp({ db: env.db, cfg: env.cfg, mp: null, mailer: { sendTickets: async () => {} }, log: () => {}, serveFrontend: false });
    const res = await postJson(app, "/api/checkout", { tierId: "general", eventId: FIRST_EVENT, quantity: 1, buyerName: "Ana", buyerEmail: "a@b.co", idempotencyKey: newKey() });
    expect(res.status).toBe(503);
  });
});
