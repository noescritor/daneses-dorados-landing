import type { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { FIRST_EVENT, SECOND_EVENT, STAFF_PIN, approvedPayment, checkout, makeEnv, postJson, sendWebhook } from "./helpers";

type Env = ReturnType<typeof makeEnv>;
let paymentSeq = 9000;

async function buy(env: Env, tierId: string, quantity: number, eventId?: string) {
  const { json } = await checkout(env.app, { tierId, quantity, ...(eventId ? { eventId } : {}) });
  const pesos = ({ general: 150, vip: 500, pass_general: 500, pass_vip: 1667 } as Record<string, number>)[tierId] * quantity;
  const id = String(++paymentSeq);
  env.mp.payments.set(id, approvedPayment(id, json.orderId, pesos));
  await sendWebhook(env.app, id);
  const order = await (await env.app.request(`/api/orders/${json.orderId}`)).json();
  return { orderId: json.orderId as string, paymentId: id, codes: order.tickets.map((t: { code: string }) => t.code) as string[] };
}

async function staffCookie(app: Hono) {
  return (await postJson(app, "/api/staff/login", { pin: STAFF_PIN })).headers.get("set-cookie")!.split(";")[0];
}

async function report(env: Env) {
  const res = await env.app.request("/api/staff/report", { headers: { Cookie: await staffCookie(env.app) } });
  expect(res.status).toBe(200);
  return res.json();
}

const find = (r: { events: { id: string }[] }, id: string) => r.events.find((e) => e.id === id) as any;

describe("reporte de ventas", () => {
  it("exige sesión de staff", async () => {
    const env = makeEnv();
    expect((await env.app.request("/api/staff/report")).status).toBe(401);
    expect((await env.app.request("/api/staff/report", { headers: { Cookie: "staff=falsa" } })).status).toBe(401);
  });

  it("sin ventas todo está en cero y lista los partidos en casa", async () => {
    const env = makeEnv();
    const r = await report(env);
    expect(r.events).toHaveLength(4);
    expect(r.totals).toMatchObject({ revenueCents: 0, ticketsIssued: 0, passesSold: 0, entriesScanned: 0, refundedOrders: 0 });
    expect(find(r, FIRST_EVENT).capacity).toEqual({ general: 5, vip: 2 });
    expect(find(r, FIRST_EVENT).available).toEqual({ general: 5, vip: 2 });
  });

  it("separa boletos sueltos y pases por partido y zona, y suma los ingresos", async () => {
    const env = makeEnv();
    await buy(env, "general", 2, FIRST_EVENT);
    await buy(env, "vip", 1, FIRST_EVENT);
    await buy(env, "general", 1, SECOND_EVENT);
    await buy(env, "pass_general", 1);

    const r = await report(env);
    const first = find(r, FIRST_EVENT);
    expect(first.singles).toEqual({ general: 2, vip: 1 });
    expect(first.passes).toEqual({ general: 1, vip: 0 });
    expect(first.sold).toEqual({ general: 3, vip: 1 });
    expect(first.singlesRevenueCents).toBe(2 * 15000 + 50000);
    const second = find(r, SECOND_EVENT);
    expect(second.singles).toEqual({ general: 1, vip: 0 });
    expect(second.passes).toEqual({ general: 1, vip: 0 });
    expect(find(r, "2026-11-21-tapatios").passes.general).toBe(1);

    expect(r.totals.revenueCents).toBe(2 * 15000 + 50000 + 15000 + 50000);
    expect(r.totals.ticketsIssued).toBe(5);
    expect(r.totals.passesSold).toBe(1);
    const byId = Object.fromEntries(r.products.map((p: any) => [p.id, p]));
    expect(byId.general).toMatchObject({ orders: 2, units: 3, revenueCents: 45000 });
    expect(byId.pass_general).toMatchObject({ orders: 1, units: 1, revenueCents: 50000 });
  });

  it("cuenta las entradas escaneadas por partido (un pase cuenta en cada partido que se usa)", async () => {
    const env = makeEnv();
    const single = await buy(env, "general", 1, FIRST_EVENT);
    const pass = await buy(env, "pass_vip", 1);
    const cookie = await staffCookie(env.app);
    const scan = (code: string, eventId: string) => postJson(env.app, "/api/staff/scan", { code, eventId }, { Cookie: cookie });

    await scan(single.codes[0], FIRST_EVENT);
    await scan(single.codes[0], FIRST_EVENT);
    await scan(pass.codes[0], FIRST_EVENT);
    await scan(pass.codes[0], SECOND_EVENT);

    const r = await report(env);
    expect(find(r, FIRST_EVENT).scanned).toEqual({ general: 1, vip: 1 });
    expect(find(r, SECOND_EVENT).scanned).toEqual({ general: 0, vip: 1 });
    expect(r.totals.entriesScanned).toBe(3);
  });

  it("los pedidos reembolsados no cuentan como ventas y se reportan aparte", async () => {
    const env = makeEnv();
    const kept = await buy(env, "general", 1, FIRST_EVENT);
    const refunded = await buy(env, "general", 2, FIRST_EVENT);
    env.mp.payments.set(refunded.paymentId, approvedPayment(refunded.paymentId, refunded.orderId, 300, "refunded"));
    await sendWebhook(env.app, refunded.paymentId);

    const r = await report(env);
    const first = find(r, FIRST_EVENT);
    expect(first.singles.general).toBe(1);
    expect(first.sold.general).toBe(1);
    expect(r.totals.revenueCents).toBe(15000);
    expect(r.totals.refundedOrders).toBe(1);
    expect(r.totals.refundedCents).toBe(30000);
    expect(kept.codes).toHaveLength(1);
  });

  it("muestra aparte los pedidos pendientes y marca los partidos ya jugados", async () => {
    const env = makeEnv();
    await checkout(env.app, { quantity: 1 });
    env.clock.now = new Date("2026-10-25T01:00:00.000Z");
    const r = await report(env);
    expect(r.totals.pendingOrders).toBe(1);
    expect(find(r, FIRST_EVENT).played).toBe(true);
    expect(find(r, SECOND_EVENT).played).toBe(false);
    expect(find(r, FIRST_EVENT).reserved.general).toBe(1);
  });
});
