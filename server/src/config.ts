import { randomBytes } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  PUBLIC_BASE_URL: z.url().default("http://localhost:8443"),
  DATABASE_PATH: z.string().default("./data/daneses.db"),
  STATIC_DIR: z.string().default("./dist"),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  STAFF_PIN: z.string().min(6).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("Daneses Dorados <boletos@localhost>"),
  RESERVATION_MINUTES: z.coerce.number().int().positive().default(15),
  MAX_QTY_PER_ORDER: z.coerce.number().int().positive().default(6),
  CAPACITY_GENERAL: z.coerce.number().int().positive().default(300),
  CAPACITY_VIP: z.coerce.number().int().positive().default(100),
});

export type Config = z.infer<typeof schema> & { SESSION_SECRET: string; isProd: boolean };

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = schema.parse(cleaned);
  const isProd = parsed.NODE_ENV === "production";
  return {
    ...parsed,
    PUBLIC_BASE_URL: parsed.PUBLIC_BASE_URL.replace(/\/+$/, ""),
    SESSION_SECRET: parsed.SESSION_SECRET ?? randomBytes(32).toString("hex"),
    isProd,
  };
}

export function assertProductionReady(cfg: Config, rawEnv: Record<string, string | undefined> = process.env): void {
  if (!cfg.isProd) return;
  const missing = ["MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET", "STAFF_PIN", "SESSION_SECRET"].filter((k) => !rawEnv[k]);
  if (missing.length) throw new Error(`Faltan variables de entorno en producción: ${missing.join(", ")}`);
  if (!cfg.PUBLIC_BASE_URL.startsWith("https://")) throw new Error("PUBLIC_BASE_URL debe ser https en producción");
}
