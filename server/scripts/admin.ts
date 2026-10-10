import { loadConfig } from "../src/config";
import { all, openDb, run } from "../src/db";
import { createEvent, seedIfEmpty } from "../src/seed";

try {
  process.loadEnvFile();
} catch {
  // sin archivo .env
}

const cfg = loadConfig();
const db = openDb(cfg.DATABASE_PATH);
seedIfEmpty(db, cfg);

const [command, ...args] = process.argv.slice(2);

const USAGE = `Uso: pnpm admin <comando>
  list                                          Muestra precios, partidos e inventario
  set-price <tier> <pesos>                      Cambia el precio (solo afecta compras nuevas)
  set-capacity <partido> <general|vip> <n>      Cambia la capacidad de un partido
  add-event <id> <rival> <fecha-ISO> [etapa]    Agrega un partido en casa (p. ej. una semifinal)
  close-sales <partido>                         Cierra la venta de un partido`;

switch (command) {
  case "list": {
    console.table(all(db, "SELECT id, name, kind, seat_class, price_cents / 100.0 AS pesos, active FROM tiers"));
    console.table(all(db, "SELECT id, rival, starts_at, stage, sales_open FROM events ORDER BY starts_at"));
    console.table(all(db, "SELECT event_id, seat_class, capacity, sold, reserved FROM inventory ORDER BY event_id, seat_class"));
    break;
  }
  case "set-price": {
    const [tier, pesos] = args;
    const cents = Math.round(Number(pesos) * 100);
    if (!tier || !Number.isFinite(cents) || cents <= 0) throw new Error(USAGE);
    if (run(db, "UPDATE tiers SET price_cents = ? WHERE id = ?", cents, tier) === 0) throw new Error(`No existe el tier "${tier}"`);
    console.log(`Precio de ${tier}: $${cents / 100} MXN`);
    break;
  }
  case "set-capacity": {
    const [eventId, seatClass, n] = args;
    const capacity = Number(n);
    if (!eventId || !["general", "vip"].includes(seatClass) || !Number.isInteger(capacity) || capacity < 0) throw new Error(USAGE);
    if (run(db, "UPDATE inventory SET capacity = ? WHERE event_id = ? AND seat_class = ?", capacity, eventId, seatClass) === 0) {
      throw new Error("No existe ese partido o clase");
    }
    console.log(`Capacidad de ${eventId} (${seatClass}): ${capacity}`);
    break;
  }
  case "add-event": {
    const [id, rival, startsAt, stage] = args;
    if (!id || !rival || !startsAt || Number.isNaN(new Date(startsAt).getTime())) throw new Error(USAGE);
    createEvent(db, { id, rival, startsAt, stage, capacity: { general: cfg.CAPACITY_GENERAL, vip: cfg.CAPACITY_VIP } });
    console.log(`Partido agregado: ${id}`);
    break;
  }
  case "close-sales": {
    const [eventId] = args;
    if (!eventId || run(db, "UPDATE events SET sales_open = 0 WHERE id = ?", eventId) === 0) throw new Error(USAGE);
    console.log(`Venta cerrada: ${eventId}`);
    break;
  }
  default:
    console.log(USAGE);
}

db.close();
