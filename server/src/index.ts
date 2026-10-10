import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { assertProductionReady, loadConfig } from "./config";
import { openDb } from "./db";
import { createMailer } from "./mailer";
import { createMpClient } from "./mp";
import { expirePendingOrders } from "./orders";
import { retryPendingEmails } from "./payments";
import { seedIfEmpty } from "./seed";

try {
  process.loadEnvFile();
} catch {
  // sin archivo .env: se usan las variables del entorno
}

const cfg = loadConfig();
assertProductionReady(cfg);

const db = openDb(cfg.DATABASE_PATH);
if (seedIfEmpty(db, cfg)) console.log("Base de datos inicializada con el catálogo de la temporada");

const mp = cfg.MP_ACCESS_TOKEN ? createMpClient(cfg.MP_ACCESS_TOKEN) : null;
if (!mp) console.warn("MP_ACCESS_TOKEN no configurado: el checkout responderá 503");
if (!cfg.MP_WEBHOOK_SECRET) console.warn("MP_WEBHOOK_SECRET no configurado: el webhook responderá 503");

const mailer = createMailer(cfg);
const app = createApp({ db, cfg, mp, mailer });

const server = serve({ fetch: app.fetch, port: cfg.PORT }, (info) => {
  console.log(`Servidor listo en http://localhost:${info.port}`);
});

const sweep = setInterval(() => {
  try {
    const expired = expirePendingOrders(db, new Date());
    if (expired > 0) console.log(`Reservas expiradas: ${expired}`);
  } catch (err) {
    console.error("Error al expirar reservas", err);
  }
  if (mp) {
    retryPendingEmails({ db, mp, mailer, cfg, now: () => new Date() }).catch((err) => console.error("Error al reenviar correos", err));
  }
}, 30_000);

function shutdown() {
  clearInterval(sweep);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
