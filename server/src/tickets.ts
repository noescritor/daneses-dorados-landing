import { type DB, tx, get, all, run } from "./db";
import type { EventRow, TierRow } from "./orders";

export interface TicketRow {
  id: string;
  order_id: string;
  tier_id: string;
  event_id: string | null;
  code: string;
  created_at: string;
  voided_at: string | null;
}

export const TICKET_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function ticketsForOrder(db: DB, orderId: string): TicketRow[] {
  return all<TicketRow>(db, "SELECT * FROM tickets WHERE order_id = ? ORDER BY created_at, id", orderId);
}

export interface TicketView {
  code: string;
  tier: { id: string; name: string; kind: "single" | "pass"; seatClass: "general" | "vip" };
  event: { id: string; rival: string; venue: string; startsAt: string } | null;
  buyerName: string;
  status: "valid" | "used" | "voided";
  scans: { eventId: string; scannedAt: string }[];
}

export function getTicketView(db: DB, code: string): TicketView | undefined {
  const row = get<TicketRow & { buyer_name: string }>(
    db,
    "SELECT t.*, o.buyer_name FROM tickets t JOIN orders o ON o.id = t.order_id WHERE t.code = ?",
    code,
  );
  if (!row) return undefined;
  const tier = get<TierRow>(db, "SELECT * FROM tiers WHERE id = ?", row.tier_id)!;
  const event = row.event_id ? get<EventRow>(db, "SELECT * FROM events WHERE id = ?", row.event_id) : undefined;
  const scans = all<{ event_id: string; scanned_at: string }>(db, "SELECT event_id, scanned_at FROM scans WHERE ticket_id = ? ORDER BY scanned_at", row.id);
  const status = row.voided_at ? "voided" : tier.kind === "single" && scans.length > 0 ? "used" : "valid";
  return {
    code: row.code,
    tier: { id: tier.id, name: tier.name, kind: tier.kind, seatClass: tier.seat_class },
    event: event ? { id: event.id, rival: event.rival, venue: event.venue, startsAt: event.starts_at } : null,
    buyerName: row.buyer_name,
    status,
    scans: scans.map((s) => ({ eventId: s.event_id, scannedAt: s.scanned_at })),
  };
}

export type ScanResult =
  | { result: "ok"; tierName: string; buyerName: string; kind: "single" | "pass" }
  | { result: "already_used"; scannedAt: string; tierName: string; buyerName: string }
  | { result: "wrong_event"; ticketEventId: string | null }
  | { result: "voided" }
  | { result: "invalid" };

export function extractTicketCode(raw: string): string {
  const trimmed = raw.trim();
  const fromUrl = trimmed.includes("/t/") ? trimmed.split("/t/").pop()!.split(/[?#]/)[0] : trimmed;
  return fromUrl;
}

export function scanTicket(db: DB, input: { code: string; eventId: string; scannedBy: string }, now: Date): ScanResult {
  const code = extractTicketCode(input.code);
  if (!TICKET_CODE_PATTERN.test(code)) return { result: "invalid" };

  return tx(db, (): ScanResult => {
    const ticket = get<TicketRow & { buyer_name: string; tier_name: string; tier_kind: "single" | "pass" }>(
      db,
      `SELECT t.*, o.buyer_name, ti.name AS tier_name, ti.kind AS tier_kind
       FROM tickets t JOIN orders o ON o.id = t.order_id JOIN tiers ti ON ti.id = t.tier_id
       WHERE t.code = ?`,
      code,
    );
    if (!ticket) return { result: "invalid" };
    if (ticket.voided_at) return { result: "voided" };

    const event = get<EventRow>(db, "SELECT * FROM events WHERE id = ?", input.eventId);
    if (!event || !event.is_home) return { result: "wrong_event", ticketEventId: ticket.event_id };
    if (ticket.tier_kind === "single" && ticket.event_id !== input.eventId) {
      return { result: "wrong_event", ticketEventId: ticket.event_id };
    }

    const inserted = run(
      db,
      "INSERT OR IGNORE INTO scans (ticket_id, event_id, scanned_at, scanned_by) VALUES (?, ?, ?, ?)",
      ticket.id,
      input.eventId,
      now.toISOString(),
      input.scannedBy,
    );
    if (inserted === 0) {
      const prev = get<{ scanned_at: string }>(db, "SELECT scanned_at FROM scans WHERE ticket_id = ? AND event_id = ?", ticket.id, input.eventId)!;
      return { result: "already_used", scannedAt: prev.scanned_at, tierName: ticket.tier_name, buyerName: ticket.buyer_name };
    }
    return { result: "ok", tierName: ticket.tier_name, buyerName: ticket.buyer_name, kind: ticket.tier_kind };
  });
}

export interface CatalogEvent {
  id: string;
  rival: string;
  venue: string;
  startsAt: string;
  stage: string;
  available: { general: number; vip: number };
}

export interface Catalog {
  tiers: { id: string; name: string; kind: "single" | "pass"; seatClass: "general" | "vip"; priceCents: number }[];
  events: CatalogEvent[];
  passAvailable: { general: number; vip: number };
}

export function getCatalog(db: DB, now: Date): Catalog {
  const tiers = all<TierRow>(db, "SELECT * FROM tiers WHERE active = 1 ORDER BY price_cents").map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    seatClass: t.seat_class,
    priceCents: t.price_cents,
  }));
  const rows = all<EventRow & { seat_class: "general" | "vip"; available: number }>(
    db,
    `SELECT e.*, i.seat_class, i.capacity - i.sold - i.reserved AS available
     FROM events e JOIN inventory i ON i.event_id = e.id
     WHERE e.is_home = 1 AND e.sales_open = 1 AND e.starts_at > ?
     ORDER BY e.starts_at`,
    now.toISOString(),
  );
  const events = new Map<string, CatalogEvent>();
  for (const r of rows) {
    const ev =
      events.get(r.id) ??
      { id: r.id, rival: r.rival, venue: r.venue, startsAt: r.starts_at, stage: r.stage, available: { general: 0, vip: 0 } };
    ev.available[r.seat_class] = Math.max(0, r.available);
    events.set(r.id, ev);
  }
  const list = [...events.values()];
  const minOf = (cls: "general" | "vip") => (list.length ? Math.min(...list.map((e) => e.available[cls])) : 0);
  return { tiers, events: list, passAvailable: { general: minOf("general"), vip: minOf("vip") } };
}
