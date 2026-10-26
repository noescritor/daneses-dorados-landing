import { type DB, all } from "./db";
import type { EventRow } from "./orders";

type Zone = "general" | "vip";
type ByZone = Record<Zone, number>;

const byZone = (): ByZone => ({ general: 0, vip: 0 });

export interface EventReport {
  id: string;
  rival: string;
  startsAt: string;
  stage: string;
  played: boolean;
  salesOpen: boolean;
  capacity: ByZone;
  sold: ByZone;
  reserved: ByZone;
  available: ByZone;
  singles: ByZone;
  passes: ByZone;
  scanned: ByZone;
  singlesRevenueCents: number;
}

export interface ProductReport {
  id: string;
  name: string;
  kind: "single" | "pass";
  orders: number;
  units: number;
  revenueCents: number;
}

export interface SalesReport {
  generatedAt: string;
  events: EventReport[];
  products: ProductReport[];
  totals: {
    revenueCents: number;
    ticketsIssued: number;
    passesSold: number;
    entriesScanned: number;
    refundedCents: number;
    refundedOrders: number;
    pendingOrders: number;
  };
}

interface ZoneCount {
  event_id: string;
  seat_class: Zone;
  n: number;
}

function addZone(map: Map<string, ByZone>, row: ZoneCount) {
  const entry = map.get(row.event_id) ?? byZone();
  entry[row.seat_class] += row.n;
  map.set(row.event_id, entry);
}

function indexByEvent(rows: ZoneCount[]): Map<string, ByZone> {
  const map = new Map<string, ByZone>();
  rows.forEach((r) => addZone(map, r));
  return map;
}

export function getSalesReport(db: DB, now: Date): SalesReport {
  const events = all<EventRow>(db, "SELECT * FROM events WHERE is_home = 1 ORDER BY starts_at");

  const inventory = new Map<string, { capacity: ByZone; sold: ByZone; reserved: ByZone }>();
  for (const r of all<{ event_id: string; seat_class: Zone; capacity: number; sold: number; reserved: number }>(db, "SELECT * FROM inventory")) {
    const entry = inventory.get(r.event_id) ?? { capacity: byZone(), sold: byZone(), reserved: byZone() };
    entry.capacity[r.seat_class] = r.capacity;
    entry.sold[r.seat_class] = r.sold;
    entry.reserved[r.seat_class] = r.reserved;
    inventory.set(r.event_id, entry);
  }

  const singles = indexByEvent(
    all<ZoneCount>(
      db,
      `SELECT tk.event_id AS event_id, ti.seat_class AS seat_class, COUNT(*) AS n
       FROM tickets tk JOIN tiers ti ON ti.id = tk.tier_id
       WHERE ti.kind = 'single' AND tk.voided_at IS NULL AND tk.event_id IS NOT NULL
       GROUP BY tk.event_id, ti.seat_class`,
    ),
  );
  const passes = indexByEvent(
    all<ZoneCount>(
      db,
      `SELECT r.event_id AS event_id, r.seat_class AS seat_class, SUM(r.quantity) AS n
       FROM order_reservations r JOIN orders o ON o.id = r.order_id JOIN tiers ti ON ti.id = o.tier_id
       WHERE o.status = 'paid' AND ti.kind = 'pass'
       GROUP BY r.event_id, r.seat_class`,
    ),
  );
  const scanned = indexByEvent(
    all<ZoneCount>(
      db,
      `SELECT s.event_id AS event_id, ti.seat_class AS seat_class, COUNT(*) AS n
       FROM scans s JOIN tickets tk ON tk.id = s.ticket_id JOIN tiers ti ON ti.id = tk.tier_id
       GROUP BY s.event_id, ti.seat_class`,
    ),
  );
  const singlesRevenue = new Map(
    all<{ event_id: string; cents: number }>(
      db,
      `SELECT o.event_id AS event_id, SUM(o.total_cents) AS cents
       FROM orders o JOIN tiers ti ON ti.id = o.tier_id
       WHERE o.status = 'paid' AND ti.kind = 'single' GROUP BY o.event_id`,
    ).map((r) => [r.event_id, r.cents]),
  );

  const nowIso = now.toISOString();
  const eventReports: EventReport[] = events.map((e) => {
    const inv = inventory.get(e.id) ?? { capacity: byZone(), sold: byZone(), reserved: byZone() };
    return {
      id: e.id,
      rival: e.rival,
      startsAt: e.starts_at,
      stage: e.stage,
      played: e.starts_at <= nowIso,
      salesOpen: Boolean(e.sales_open),
      capacity: inv.capacity,
      sold: inv.sold,
      reserved: inv.reserved,
      available: {
        general: Math.max(0, inv.capacity.general - inv.sold.general - inv.reserved.general),
        vip: Math.max(0, inv.capacity.vip - inv.sold.vip - inv.reserved.vip),
      },
      singles: singles.get(e.id) ?? byZone(),
      passes: passes.get(e.id) ?? byZone(),
      scanned: scanned.get(e.id) ?? byZone(),
      singlesRevenueCents: singlesRevenue.get(e.id) ?? 0,
    };
  });

  const products = all<{ id: string; name: string; kind: "single" | "pass"; orders: number; units: number; revenue_cents: number }>(
    db,
    `SELECT ti.id AS id, ti.name AS name, ti.kind AS kind, COUNT(o.id) AS orders,
            COALESCE(SUM(o.quantity), 0) AS units, COALESCE(SUM(o.total_cents), 0) AS revenue_cents
     FROM tiers ti LEFT JOIN orders o ON o.tier_id = ti.id AND o.status = 'paid'
     GROUP BY ti.id ORDER BY ti.price_cents`,
  ).map((p) => ({ id: p.id, name: p.name, kind: p.kind, orders: p.orders, units: p.units, revenueCents: p.revenue_cents }));

  const statuses = new Map(
    all<{ status: string; n: number; cents: number }>(db, "SELECT status, COUNT(*) AS n, COALESCE(SUM(total_cents), 0) AS cents FROM orders GROUP BY status").map((r) => [r.status, r]),
  );
  const sum = (zones: ByZone) => zones.general + zones.vip;

  return {
    generatedAt: nowIso,
    events: eventReports,
    products,
    totals: {
      revenueCents: products.reduce((a, p) => a + p.revenueCents, 0),
      ticketsIssued: products.reduce((a, p) => a + p.units, 0),
      passesSold: products.filter((p) => p.kind === "pass").reduce((a, p) => a + p.units, 0),
      entriesScanned: eventReports.reduce((a, e) => a + sum(e.scanned), 0),
      refundedCents: statuses.get("refunded")?.cents ?? 0,
      refundedOrders: statuses.get("refunded")?.n ?? 0,
      pendingOrders: statuses.get("pending")?.n ?? 0,
    },
  };
}
