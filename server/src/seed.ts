import { type DB, tx, get, run } from "./db";
import type { Config } from "./config";

const HOME_VENUE = "Salón Poliforum, Dorados Convention & Resort, Oaxtepec, Morelos";

const TIERS = [
  { id: "general", name: "General", kind: "single", seatClass: "general", priceCents: 15000 },
  { id: "vip", name: "VIP", kind: "single", seatClass: "vip", priceCents: 50000 },
  { id: "pass_general", name: "Pase de Temporada General", kind: "pass", seatClass: "general", priceCents: 50000 },
  { id: "pass_vip", name: "Pase de Temporada VIP", kind: "pass", seatClass: "vip", priceCents: 166700 },
] as const;

const HOME_EVENTS = [
  { id: "2026-10-24-dragones", rival: "Dragones de Querétaro", startsAt: "2026-10-24T18:00:00-06:00" },
  { id: "2026-11-07-aztecas", rival: "Aztecas", startsAt: "2026-11-07T18:00:00-06:00" },
  { id: "2026-11-14-angeles", rival: "Ángeles CD México", startsAt: "2026-11-14T18:00:00-06:00" },
  { id: "2026-11-21-tapatios", rival: "Tapatíos", startsAt: "2026-11-21T18:00:00-06:00" },
];

export interface NewEvent {
  id: string;
  rival: string;
  venue?: string;
  startsAt: string;
  stage?: string;
  capacity: { general: number; vip: number };
}

// Un evento nuevo (p. ej. una semifinal) nace con los asientos de pase ya ocupados.
export function createEvent(db: DB, ev: NewEvent): void {
  tx(db, () => {
    run(
      db,
      "INSERT INTO events (id, rival, venue, starts_at, is_home, stage, sales_open) VALUES (?, ?, ?, ?, 1, ?, 1)",
      ev.id,
      ev.rival,
      ev.venue ?? HOME_VENUE,
      new Date(ev.startsAt).toISOString(),
      ev.stage ?? "regular",
    );
    for (const seatClass of ["general", "vip"] as const) {
      const passes = get<{ n: number }>(
        db,
        `SELECT COALESCE(SUM(o.quantity), 0) AS n FROM orders o JOIN tiers t ON t.id = o.tier_id
         WHERE o.status = 'paid' AND t.kind = 'pass' AND t.seat_class = ?`,
        seatClass,
      )!.n;
      run(
        db,
        "INSERT INTO inventory (event_id, seat_class, capacity, sold, reserved) VALUES (?, ?, ?, ?, 0)",
        ev.id,
        seatClass,
        ev.capacity[seatClass],
        passes,
      );
      run(
        db,
        `INSERT INTO order_reservations (order_id, event_id, seat_class, quantity)
         SELECT o.id, ?, t.seat_class, o.quantity FROM orders o JOIN tiers t ON t.id = o.tier_id
         WHERE o.status = 'paid' AND t.kind = 'pass' AND t.seat_class = ?`,
        ev.id,
        seatClass,
      );
    }
  });
}

export function seedIfEmpty(db: DB, cfg: Pick<Config, "CAPACITY_GENERAL" | "CAPACITY_VIP">): boolean {
  if (get<{ n: number }>(db, "SELECT COUNT(*) AS n FROM tiers")!.n > 0) return false;
  tx(db, () => {
    for (const t of TIERS) {
      run(db, "INSERT INTO tiers (id, name, kind, seat_class, price_cents) VALUES (?, ?, ?, ?, ?)", t.id, t.name, t.kind, t.seatClass, t.priceCents);
    }
  });
  for (const ev of HOME_EVENTS) {
    createEvent(db, { ...ev, capacity: { general: cfg.CAPACITY_GENERAL, vip: cfg.CAPACITY_VIP } });
  }
  return true;
}
