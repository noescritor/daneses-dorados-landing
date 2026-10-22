import type { Hono } from "hono";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { openDb } from "../src/db";
import type { Mailer, TicketEmail } from "../src/mailer";
import type { MercadoPagoClient, MpPayment, PreferenceInput } from "../src/mp";
import { seedIfEmpty } from "../src/seed";
import { buildManifest, signManifest } from "../src/signature";

export const WEBHOOK_SECRET = "whsec_test_secret_value";
export const STAFF_PIN = "246810";
export const FIRST_EVENT = "2026-10-24-dragones";
export const SECOND_EVENT = "2026-11-07-aztecas";

export function fakeMp() {
  const payments = new Map<string, MpPayment>();
  const refunds: { paymentId: string; key: string }[] = [];
  const preferences: PreferenceInput[] = [];
  const state = { failPreference: false, failGetPayment: false, searchCalls: 0 };
  let seq = 0;
  const client: MercadoPagoClient = {
    async createPreference(input) {
      if (state.failPreference) throw new Error("mp caído");
      preferences.push(input);
      seq++;
      return { id: `pref-${seq}`, initPoint: `https://mp.test/checkout?pref=${seq}` };
    },
    async getPayment(id) {
      if (state.failGetPayment) throw new Error("mp caído");
      const payment = payments.get(id);
      if (!payment) throw new Error(`pago ${id} no existe`);
      return payment;
    },
    async searchPaymentsByReference(reference) {
      state.searchCalls++;
      return [...payments.values()].filter((p) => p.external_reference === reference);
    },
    async refundPayment(paymentId, key) {
      refunds.push({ paymentId, key });
    },
  };
  return { client, payments, refunds, preferences, state };
}

export function makeEnv(overrides: Record<string, string> = {}) {
  const cfg = loadConfig({
    NODE_ENV: "test",
    MP_ACCESS_TOKEN: "TEST-access-token",
    MP_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STAFF_PIN,
    SESSION_SECRET: "s".repeat(40),
    PUBLIC_BASE_URL: "https://tienda.test",
    CAPACITY_GENERAL: "5",
    CAPACITY_VIP: "2",
    ...overrides,
  });
  const db = openDb(":memory:");
  seedIfEmpty(db, cfg);
  const mp = fakeMp();
  const sent: TicketEmail[] = [];
  const mailer: Mailer = {
    async sendTickets(email) {
      sent.push(email);
    },
  };
  const clock = { now: new Date("2026-10-10T12:00:00.000Z") };
  const app = createApp({ db, cfg, mp: mp.client, mailer, now: () => clock.now, log: () => {}, info: () => {}, serveFrontend: false });
  return { cfg, db, mp, sent, clock, app };
}

let ipCounter = 0;
let keyCounter = 0;

export const newKey = () => `test-key-${String(++keyCounter).padStart(8, "0")}-abcdefgh`;

export async function postJson(app: Hono, path: string, body: unknown, headers: Record<string, string> = {}) {
  ipCounter++;
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${ipCounter % 250}.${Math.floor(ipCounter / 250)}`, ...headers },
    body: JSON.stringify(body),
  });
}

export interface CheckoutBody {
  tierId?: string;
  eventId?: string | null;
  quantity?: number;
  idempotencyKey?: string;
  [extra: string]: unknown;
}

export async function checkout(app: Hono, body: CheckoutBody = {}) {
  const tierId = body.tierId ?? "general";
  const payload = {
    tierId,
    eventId: tierId.startsWith("pass") ? null : FIRST_EVENT,
    quantity: 1,
    buyerName: "Ana Pérez",
    buyerEmail: "Ana@Example.com",
    idempotencyKey: newKey(),
    ...body,
  };
  const res = await postJson(app, "/api/checkout", payload);
  return { res, json: (await res.json()) as Record<string, any> };
}

export function signedHeaders(dataId: string, requestId = `req-${Math.random().toString(36).slice(2)}`, secret = WEBHOOK_SECRET) {
  const ts = "1742505638683";
  const v1 = signManifest(buildManifest(dataId, requestId, ts), secret);
  return { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId };
}

export async function sendWebhook(
  app: Hono,
  paymentId: string,
  opts: { headers?: Record<string, string>; type?: string } = {},
) {
  const type = opts.type ?? "payment";
  return app.request(`/api/webhooks/mercadopago?data.id=${paymentId}&type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? signedHeaders(paymentId)) },
    body: JSON.stringify({ type, action: "payment.updated", data: { id: paymentId } }),
  });
}

export function approvedPayment(paymentId: string, orderId: string, amountPesos: number, status = "approved"): MpPayment {
  return { id: Number(paymentId), status, external_reference: orderId, transaction_amount: amountPesos, currency_id: "MXN" };
}

export async function catalog(app: Hono) {
  return (await (await app.request("/api/catalog")).json()) as {
    tiers: { id: string; priceCents: number }[];
    events: { id: string; available: { general: number; vip: number } }[];
    passAvailable: { general: number; vip: number };
  };
}
