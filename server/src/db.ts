import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type DB = DatabaseSync;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('single','pass')),
    seat_class TEXT NOT NULL CHECK (seat_class IN ('general','vip')),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    rival TEXT NOT NULL,
    venue TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    is_home INTEGER NOT NULL,
    stage TEXT NOT NULL DEFAULT 'regular',
    sales_open INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE inventory (
    event_id TEXT NOT NULL REFERENCES events(id),
    seat_class TEXT NOT NULL CHECK (seat_class IN ('general','vip')),
    capacity INTEGER NOT NULL,
    sold INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (event_id, seat_class),
    CHECK (sold >= 0 AND reserved >= 0 AND sold + reserved <= capacity)
  );
  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending','paid','expired','failed','refunded')),
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    tier_id TEXT NOT NULL REFERENCES tiers(id),
    event_id TEXT REFERENCES events(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'MXN',
    reserved_until TEXT NOT NULL,
    mp_preference_id TEXT,
    mp_init_point TEXT,
    mp_payment_id TEXT UNIQUE,
    email_sent_at TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT
  );
  CREATE INDEX idx_orders_status ON orders(status, reserved_until);
  CREATE TABLE order_reservations (
    order_id TEXT NOT NULL REFERENCES orders(id),
    event_id TEXT NOT NULL REFERENCES events(id),
    seat_class TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (order_id, event_id)
  );
  CREATE TABLE webhook_events (
    key TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('received','done')),
    received_at TEXT NOT NULL,
    processed_at TEXT
  );
  CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    tier_id TEXT NOT NULL REFERENCES tiers(id),
    event_id TEXT REFERENCES events(id),
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    voided_at TEXT
  );
  CREATE INDEX idx_tickets_order ON tickets(order_id);
  CREATE TABLE scans (
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    event_id TEXT NOT NULL REFERENCES events(id),
    scanned_at TEXT NOT NULL,
    scanned_by TEXT,
    PRIMARY KEY (ticket_id, event_id)
  );
  `,
];

function migrate(db: DB): void {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

export function openDb(file: string): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(db);
  return db;
}

// Síncrono a propósito: nunca se debe hacer `await` dentro de la transacción.
export function tx<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // la transacción ya terminó
    }
    throw err;
  }
}

export function get<T>(db: DB, sql: string, ...params: SQLInputValue[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function all<T>(db: DB, sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(db: DB, sql: string, ...params: SQLInputValue[]): number {
  return Number(db.prepare(sql).run(...params).changes);
}
