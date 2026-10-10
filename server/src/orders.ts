import { randomBytes, randomUUID } from "node:crypto";
import { type DB, tx, get, all, run } from "./db";

export interface TierRow {
  id: string;
  name: string;
  kind: "single" | "pass";
  seat_class: "general" | "vip";
  price_cents: number;
  active: number;
}

export interface EventRow {
  id: string;
  rival: string;
  venue: string;
  starts_at: string;
  is_home: number;
  stage: string;
  sales_open: number;
}

export type OrderStatus = "pending" | "paid" | "expired" | "failed" | "refunded";

export interface OrderRow {
  id: string;
  idempotency_key: string;
  status: OrderStatus;
  buyer_name: string;
  buyer_email: string;
  tier_id: string;
  event_id: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  currency: string;
  reserved_until: string;
  mp_preference_id: string | null;
  mp_init_point: string | null;
  mp_payment_id: string | null;
  email_sent_at: string | null;
  created_at: string;
  paid_at: string | null;
}

interface ReservationRow {
  order_id: string;
  event_id: string;
  seat_class: string;
  quantity: number;
}

export type OrderErrorCode =
  | "invalid_tier"
  | "invalid_event"
  | "invalid_quantity"
  | "not_on_sale"
  | "sold_out"
  | "idempotency_conflict";

export class OrderError extends Error {
  constructor(public code: OrderErrorCode) {
    super(code);
  }
}

class StockGone extends Error {}

export interface CreateOrderInput {
  tierId: string;
  eventId?: string | null;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  idempotencyKey: string;
}

export interface CreateOrderOptions {
  now: Date;
  reservationMinutes: number;
  maxQuantity: number;
}

export function createOrder(db: DB, opts: CreateOrderOptions, input: CreateOrderInput): OrderRow {
  return tx(db, () => {
    const existing = get<OrderRow>(db, "SELECT * FROM orders WHERE idempotency_key = ?", input.idempotencyKey);
    if (existing) {
      const same =
        existing.tier_id === input.tierId &&
        existing.event_id === (input.eventId ?? null) &&
        existing.quantity === input.quantity &&
        existing.buyer_email === input.buyerEmail;
      if (!same) throw new OrderError("idempotency_conflict");
      return existing;
    }

    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > opts.maxQuantity) {
      throw new OrderError("invalid_quantity");
    }
    const tier = get<TierRow>(db, "SELECT * FROM tiers WHERE id = ? AND active = 1", input.tierId);
    if (!tier) throw new OrderError("invalid_tier");

    const nowIso = opts.now.toISOString();
    let targets: EventRow[];
    if (tier.kind === "single") {
      if (!input.eventId) throw new OrderError("invalid_event");
      const ev = get<EventRow>(db, "SELECT * FROM events WHERE id = ?", input.eventId);
      if (!ev || !ev.is_home || !ev.sales_open || ev.starts_at <= nowIso) throw new OrderError("not_on_sale");
      targets = [ev];
    } else {
      if (input.eventId) throw new OrderError("invalid_event");
      targets = all<EventRow>(
        db,
        "SELECT * FROM events WHERE is_home = 1 AND sales_open = 1 AND starts_at > ? ORDER BY starts_at",
        nowIso,
      );
      if (targets.length === 0) throw new OrderError("not_on_sale");
    }

    for (const ev of targets) {
      const changed = run(
        db,
        `UPDATE inventory SET reserved = reserved + ?
         WHERE event_id = ? AND seat_class = ? AND sold + reserved + ? <= capacity`,
        input.quantity,
        ev.id,
        tier.seat_class,
        input.quantity,
      );
      if (changed === 0) throw new OrderError("sold_out");
    }

    const id = randomUUID();
    const reservedUntil = new Date(opts.now.getTime() + opts.reservationMinutes * 60_000).toISOString();
    run(
      db,
      `INSERT INTO orders (id, idempotency_key, status, buyer_name, buyer_email, tier_id, event_id, quantity,
                           unit_price_cents, total_cents, currency, reserved_until, created_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'MXN', ?, ?)`,
      id,
      input.idempotencyKey,
      input.buyerName,
      input.buyerEmail,
      tier.id,
      tier.kind === "single" ? targets[0].id : null,
      input.quantity,
      tier.price_cents,
      tier.price_cents * input.quantity,
      reservedUntil,
      nowIso,
    );
    for (const ev of targets) {
      run(db, "INSERT INTO order_reservations (order_id, event_id, seat_class, quantity) VALUES (?, ?, ?, ?)", id, ev.id, tier.seat_class, input.quantity);
    }
    return get<OrderRow>(db, "SELECT * FROM orders WHERE id = ?", id)!;
  });
}

export function getOrder(db: DB, id: string): OrderRow | undefined {
  return get<OrderRow>(db, "SELECT * FROM orders WHERE id = ?", id);
}

export function setPreference(db: DB, orderId: string, preferenceId: string, initPoint: string): void {
  run(db, "UPDATE orders SET mp_preference_id = ?, mp_init_point = ? WHERE id = ?", preferenceId, initPoint, orderId);
}

function releaseReserved(db: DB, orderId: string): void {
  for (const r of all<ReservationRow>(db, "SELECT * FROM order_reservations WHERE order_id = ?", orderId)) {
    run(db, "UPDATE inventory SET reserved = reserved - ? WHERE event_id = ? AND seat_class = ?", r.quantity, r.event_id, r.seat_class);
  }
}

export function cancelPendingOrder(db: DB, orderId: string, status: "failed" | "expired"): boolean {
  return tx(db, () => {
    const order = get<OrderRow>(db, "SELECT * FROM orders WHERE id = ?", orderId);
    if (!order || order.status !== "pending") return false;
    releaseReserved(db, orderId);
    run(db, "UPDATE orders SET status = ? WHERE id = ?", status, orderId);
    return true;
  });
}

export function expirePendingOrders(db: DB, now: Date): number {
  return tx(db, () => {
    const due = all<OrderRow>(db, "SELECT * FROM orders WHERE status = 'pending' AND reserved_until <= ?", now.toISOString());
    for (const order of due) {
      releaseReserved(db, order.id);
      run(db, "UPDATE orders SET status = 'expired' WHERE id = ?", order.id);
    }
    return due.length;
  });
}

export type FinalizeOutcome =
  | { kind: "paid"; order: OrderRow; newlyPaid: boolean }
  | { kind: "refund_needed"; order: OrderRow; reason: "stock_gone" | "duplicate_payment" }
  | { kind: "ignored" };

function newTicketCode(): string {
  return randomBytes(16).toString("base64url");
}

export function finalizeApprovedPayment(db: DB, orderId: string, paymentId: string, now: Date): FinalizeOutcome {
  try {
    return tx(db, (): FinalizeOutcome => {
      const order = get<OrderRow>(db, "SELECT * FROM orders WHERE id = ?", orderId);
      if (!order) return { kind: "ignored" };

      if (order.status === "paid") {
        return order.mp_payment_id === paymentId
          ? { kind: "paid", order, newlyPaid: false }
          : { kind: "refund_needed", order, reason: "duplicate_payment" };
      }
      if (order.status === "refunded") {
        return order.mp_payment_id === paymentId
          ? { kind: "ignored" }
          : { kind: "refund_needed", order, reason: "duplicate_payment" };
      }

      const reservations = all<ReservationRow>(db, "SELECT * FROM order_reservations WHERE order_id = ?", orderId);
      for (const r of reservations) {
        if (order.status === "pending") {
          run(
            db,
            "UPDATE inventory SET reserved = reserved - ?, sold = sold + ? WHERE event_id = ? AND seat_class = ?",
            r.quantity,
            r.quantity,
            r.event_id,
            r.seat_class,
          );
        } else {
          const taken = run(
            db,
            `UPDATE inventory SET sold = sold + ?
             WHERE event_id = ? AND seat_class = ? AND sold + reserved + ? <= capacity`,
            r.quantity,
            r.event_id,
            r.seat_class,
            r.quantity,
          );
          if (taken === 0) throw new StockGone();
        }
      }

      const nowIso = now.toISOString();
      run(db, "UPDATE orders SET status = 'paid', mp_payment_id = ?, paid_at = ? WHERE id = ?", paymentId, nowIso, orderId);
      for (let i = 0; i < order.quantity; i++) {
        run(
          db,
          "INSERT INTO tickets (id, order_id, tier_id, event_id, code, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          randomUUID(),
          orderId,
          order.tier_id,
          order.event_id,
          newTicketCode(),
          nowIso,
        );
      }
      return { kind: "paid", order: get<OrderRow>(db, "SELECT * FROM orders WHERE id = ?", orderId)!, newlyPaid: true };
    });
  } catch (err) {
    if (err instanceof StockGone) {
      return { kind: "refund_needed", order: getOrder(db, orderId)!, reason: "stock_gone" };
    }
    throw err;
  }
}

export function markOrderRefunded(db: DB, orderId: string, paymentId: string): void {
  run(db, "UPDATE orders SET status = 'refunded', mp_payment_id = COALESCE(mp_payment_id, ?) WHERE id = ? AND status <> 'paid'", paymentId, orderId);
}

export function voidPaidOrder(db: DB, orderId: string, paymentId: string, now: Date): boolean {
  return tx(db, () => {
    const order = get<OrderRow>(db, "SELECT * FROM orders WHERE id = ?", orderId);
    if (!order || order.status !== "paid" || order.mp_payment_id !== paymentId) return false;
    for (const r of all<ReservationRow>(db, "SELECT * FROM order_reservations WHERE order_id = ?", orderId)) {
      run(db, "UPDATE inventory SET sold = sold - ? WHERE event_id = ? AND seat_class = ?", r.quantity, r.event_id, r.seat_class);
    }
    run(db, "UPDATE tickets SET voided_at = ? WHERE order_id = ?", now.toISOString(), orderId);
    run(db, "UPDATE orders SET status = 'refunded' WHERE id = ?", orderId);
    return true;
  });
}

export function ordersNeedingEmail(db: DB, olderThan: Date, limit = 20): OrderRow[] {
  return all<OrderRow>(
    db,
    "SELECT * FROM orders WHERE status = 'paid' AND email_sent_at IS NULL AND paid_at <= ? ORDER BY paid_at LIMIT ?",
    olderThan.toISOString(),
    limit,
  );
}

export function markEmailSent(db: DB, orderId: string, now: Date): void {
  run(db, "UPDATE orders SET email_sent_at = ? WHERE id = ?", now.toISOString(), orderId);
}

export function claimWebhookEvent(db: DB, key: string, now: Date): "new" | "retry" | "done" {
  return tx(db, () => {
    const row = get<{ status: string }>(db, "SELECT status FROM webhook_events WHERE key = ?", key);
    if (!row) {
      run(db, "INSERT INTO webhook_events (key, status, received_at) VALUES (?, 'received', ?)", key, now.toISOString());
      return "new";
    }
    return row.status === "done" ? "done" : "retry";
  });
}

export function completeWebhookEvent(db: DB, key: string, now: Date): void {
  run(db, "UPDATE webhook_events SET status = 'done', processed_at = ? WHERE key = ?", now.toISOString(), key);
}
