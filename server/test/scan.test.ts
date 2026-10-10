import type { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createEvent } from "../src/seed";
import { FIRST_EVENT, SECOND_EVENT, STAFF_PIN, approvedPayment, catalog, checkout, makeEnv, postJson, sendWebhook } from "./helpers";

async function buy(env: ReturnType<typeof makeEnv>, tierId: string, quantity: number, paymentId: string, pesos: number) {
  const { json } = await checkout(env.app, { tierId, quantity });
  env.mp.payments.set(paymentId, approvedPayment(paymentId, json.orderId, pesos));
  await sendWebhook(env.app, paymentId);
  const order = await (await env.app.request(`/api/orders/${json.orderId}`)).json();
  return order.tickets.map((t: { code: string }) => t.code) as string[];
}

async function staffCookie(app: Hono) {
  const res = await postJson(app, "/api/staff/login", { pin: STAFF_PIN });
  return res.headers.get("set-cookie")!.split(";")[0];
}

async function scan(app: Hono, cookie: string, code: string, eventId: string) {
  const res = await postJson(app, "/api/staff/scan", { code, eventId }, { Cookie: cookie });
  return (await res.json()) as Record<string, any>;
}

describe("boletos y escáner", () => {
  it("el escáner exige sesión de staff", async () => {
    const { app } = makeEnv();
    expect((await postJson(app, "/api/staff/scan", { code: "x".repeat(22), eventId: FIRST_EVENT })).status).toBe(401);
    expect((await app.request("/api/staff/events")).status).toBe(401);
    expect((await postJson(app, "/api/staff/login", { pin: "000000" })).status).toBe(401);
  });

  it("rechaza una cookie de sesión falsificada", async () => {
    const { app } = makeEnv();
    const res = await postJson(app, "/api/staff/scan", { code: "x".repeat(22), eventId: FIRST_EVENT }, { Cookie: "staff=v1.9999999999.abc" });
    expect(res.status).toBe(401);
  });

  it("un boleto se marca como usado en el primer escaneo y se rechaza en el segundo", async () => {
    const env = makeEnv();
    const [code] = await buy(env, "general", 1, "2001", 150);
    const cookie = await staffCookie(env.app);

    const first = await scan(env.app, cookie, code, FIRST_EVENT);
    expect(first.result).toBe("ok");
    const second = await scan(env.app, cookie, code, FIRST_EVENT);
    expect(second.result).toBe("already_used");
    expect(second.scannedAt).toBeTruthy();

    const view = await (await env.app.request(`/api/tickets/${code}`)).json();
    expect(view.status).toBe("used");
  });

  it("acepta el contenido completo del QR (URL) y no solo el código", async () => {
    const env = makeEnv();
    const [code] = await buy(env, "general", 1, "2002", 150);
    const cookie = await staffCookie(env.app);
    expect((await scan(env.app, cookie, `${env.cfg.PUBLIC_BASE_URL}/t/${code}`, FIRST_EVENT)).result).toBe("ok");
  });

  it("rechaza un boleto de otro partido", async () => {
    const env = makeEnv();
    const [code] = await buy(env, "general", 1, "2003", 150);
    const cookie = await staffCookie(env.app);
    expect((await scan(env.app, cookie, code, SECOND_EVENT)).result).toBe("wrong_event");
    expect((await scan(env.app, cookie, code, FIRST_EVENT)).result).toBe("ok");
  });

  it("rechaza códigos inventados", async () => {
    const env = makeEnv();
    const cookie = await staffCookie(env.app);
    expect((await scan(env.app, cookie, "A".repeat(22), FIRST_EVENT)).result).toBe("invalid");
    expect((await scan(env.app, cookie, "corto", FIRST_EVENT)).result).toBe("invalid");
  });

  it("cada boleto de una compra tiene un código distinto", async () => {
    const env = makeEnv();
    const codes = await buy(env, "general", 4, "2004", 600);
    expect(new Set(codes).size).toBe(4);
    codes.forEach((c) => expect(c).toMatch(/^[A-Za-z0-9_-]{22}$/));
  });

  it("el pase se puede usar una vez por partido, incluso en varios partidos", async () => {
    const env = makeEnv();
    const [code] = await buy(env, "pass_general", 1, "2005", 500);
    const cookie = await staffCookie(env.app);
    expect((await scan(env.app, cookie, code, FIRST_EVENT)).result).toBe("ok");
    expect((await scan(env.app, cookie, code, FIRST_EVENT)).result).toBe("already_used");
    expect((await scan(env.app, cookie, code, SECOND_EVENT)).result).toBe("ok");
    const view = await (await env.app.request(`/api/tickets/${code}`)).json();
    expect(view.status).toBe("valid");
    expect(view.scans).toHaveLength(2);
  });

  it("una semifinal agregada después ya cuenta con los pases vendidos", async () => {
    const env = makeEnv();
    const [code] = await buy(env, "pass_vip", 1, "2006", 1667);
    createEvent(env.db, { id: "2026-12-12-semifinal", rival: "Por definir", startsAt: "2026-12-12T19:00:00-06:00", stage: "semifinal", capacity: { general: 5, vip: 2 } });

    const inv = env.db.prepare("SELECT sold FROM inventory WHERE event_id = '2026-12-12-semifinal' AND seat_class = 'vip'").get() as { sold: number };
    expect(inv.sold).toBe(1);
    const c = await catalog(env.app);
    expect(c.events.find((e) => e.id === "2026-12-12-semifinal")!.available.vip).toBe(1);

    const cookie = await staffCookie(env.app);
    expect((await scan(env.app, cookie, code, "2026-12-12-semifinal")).result).toBe("ok");
  });

  it("sirve el QR como SVG solo para boletos que existen", async () => {
    const env = makeEnv();
    const [code] = await buy(env, "general", 1, "2007", 150);
    const ok = await env.app.request(`/api/tickets/${code}/qr.svg`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("image/svg+xml");
    expect(await ok.text()).toContain("<svg");
    expect((await env.app.request(`/api/tickets/${"B".repeat(22)}/qr.svg`)).status).toBe(404);
  });

  it("no revela los códigos de boleto hasta que la orden está pagada", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    const order = await (await env.app.request(`/api/orders/${json.orderId}`)).json();
    expect(order.status).toBe("pending");
    expect(order.tickets).toEqual([]);
    expect((await env.app.request("/api/orders/no-es-un-uuid")).status).toBe(404);
  });
});
