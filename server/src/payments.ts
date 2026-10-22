import type { Config } from "./config";
import type { DB } from "./db";
import { get } from "./db";
import type { Mailer } from "./mailer";
import type { MercadoPagoClient, MpPayment } from "./mp";
import {
  type EventRow,
  type OrderRow,
  type TierRow,
  finalizeApprovedPayment,
  getOrder,
  markEmailSent,
  markOrderRefunded,
  ordersNeedingEmail,
  voidPaidOrder,
} from "./orders";
import { ticketsForOrder } from "./tickets";

export interface PaymentDeps {
  db: DB;
  mp: MercadoPagoClient;
  mailer: Mailer;
  cfg: Pick<Config, "PUBLIC_BASE_URL">;
  now: () => Date;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

export type PaymentResult =
  | "paid"
  | "already_paid"
  | "refunded_stock_gone"
  | "refunded_duplicate"
  | "voided"
  | "amount_mismatch"
  | "not_final"
  | "ignored";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(iso));

export function describeOrder(db: DB, order: OrderRow): string {
  const tier = get<TierRow>(db, "SELECT * FROM tiers WHERE id = ?", order.tier_id)!;
  const event = order.event_id ? get<EventRow>(db, "SELECT * FROM events WHERE id = ?", order.event_id) : undefined;
  const qty = order.quantity > 1 ? `${order.quantity} × ` : "";
  return event
    ? `${qty}${tier.name}: Daneses vs ${event.rival}, ${formatDate(event.starts_at)}`
    : `${qty}${tier.name}: válido en todos los partidos en casa, semifinales incluidas`;
}

export async function sendOrderEmail(deps: PaymentDeps, order: OrderRow): Promise<boolean> {
  try {
    const tickets = ticketsForOrder(deps.db, order.id).map((t) => ({
      code: t.code,
      url: `${deps.cfg.PUBLIC_BASE_URL}/t/${t.code}`,
    }));
    await deps.mailer.sendTickets({
      to: order.buyer_email,
      buyerName: order.buyer_name,
      orderId: order.id,
      summary: describeOrder(deps.db, order),
      tickets,
    });
    markEmailSent(deps.db, order.id, deps.now());
    return true;
  } catch (err) {
    deps.log?.("No se pudo enviar el correo de boletos", { orderId: order.id, error: String(err) });
    return false;
  }
}

export async function retryPendingEmails(deps: PaymentDeps): Promise<number> {
  const olderThan = new Date(deps.now().getTime() - 60_000);
  let sent = 0;
  for (const order of ordersNeedingEmail(deps.db, olderThan)) {
    if (await sendOrderEmail(deps, order)) sent++;
  }
  return sent;
}

export async function handlePaymentNotification(deps: PaymentDeps, paymentId: string): Promise<PaymentResult> {
  return processPayment(deps, await deps.mp.getPayment(paymentId));
}

// Respaldo del webhook: pregunta a Mercado Pago por los pagos de la orden y aplica los aprobados
// con la misma lógica (idempotente) que el webhook.
export async function reconcileOrder(deps: PaymentDeps, orderId: string): Promise<boolean> {
  const order = getOrder(deps.db, orderId);
  if (!order || (order.status !== "pending" && order.status !== "expired")) return false;
  let changed = false;
  for (const payment of await deps.mp.searchPaymentsByReference(orderId)) {
    if (payment.status !== "approved") continue;
    const result = await processPayment(deps, payment);
    if (result === "paid" || result === "refunded_stock_gone" || result === "refunded_duplicate") changed = true;
  }
  return changed;
}

export async function processPayment(deps: PaymentDeps, payment: MpPayment): Promise<PaymentResult> {
  const orderId = payment.external_reference;
  if (!orderId) return "ignored";
  const order = getOrder(deps.db, orderId);
  if (!order) return "ignored";

  if (payment.currency_id !== order.currency || Math.round(payment.transaction_amount * 100) !== order.total_cents) {
    deps.log?.("Monto o moneda del pago no coincide con la orden", { orderId, paymentId: String(payment.id) });
    return "amount_mismatch";
  }

  const paymentKey = String(payment.id);
  switch (payment.status) {
    case "approved": {
      const outcome = finalizeApprovedPayment(deps.db, order.id, paymentKey, deps.now());
      if (outcome.kind === "ignored") return "ignored";
      if (outcome.kind === "refund_needed") {
        await deps.mp.refundPayment(paymentKey, `refund-${paymentKey}`);
        if (outcome.reason === "stock_gone") {
          markOrderRefunded(deps.db, order.id, paymentKey);
          return "refunded_stock_gone";
        }
        return "refunded_duplicate";
      }
      if (!outcome.newlyPaid) return "already_paid";
      await sendOrderEmail(deps, outcome.order);
      return "paid";
    }
    case "refunded":
    case "charged_back":
      return voidPaidOrder(deps.db, order.id, paymentKey, deps.now()) ? "voided" : "ignored";
    default:
      return "not_final";
  }
}
