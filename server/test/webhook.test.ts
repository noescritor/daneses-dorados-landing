import { describe, expect, it } from "vitest";
import { expirePendingOrders } from "../src/orders";
import { FIRST_EVENT, approvedPayment, catalog, checkout, makeEnv, sendWebhook, signedHeaders } from "./helpers";

function countTickets(db: ReturnType<typeof makeEnv>["db"], orderId: string) {
  return (db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE order_id = ?").get(orderId) as { n: number }).n;
}

function orderStatus(db: ReturnType<typeof makeEnv>["db"], orderId: string) {
  return (db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: string }).status;
}

describe("webhook con varias claves secretas (prueba y productivo)", () => {
  it("acepta la firma de cualquiera de las claves configuradas y rechaza otras", async () => {
    const env = makeEnv({ MP_WEBHOOK_SECRET: "clave-de-prueba-111, clave-productiva-222" });
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1101", approvedPayment("1101", json.orderId, 150));

    expect((await sendWebhook(env.app, "1101", { headers: signedHeaders("1101", "req-a", "clave-de-otro-333") })).status).toBe(401);
    expect((await sendWebhook(env.app, "1101", { headers: signedHeaders("1101", "req-b", "clave-productiva-222") })).status).toBe(200);
    expect(orderStatus(env.db, json.orderId)).toBe("paid");

    const other = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1102", approvedPayment("1102", other.json.orderId, 150));
    expect((await sendWebhook(env.app, "1102", { headers: signedHeaders("1102", "req-c", "clave-de-prueba-111") })).status).toBe(200);
    expect(orderStatus(env.db, other.json.orderId)).toBe("paid");
  });
});

describe("webhook de Mercado Pago", () => {
  it("rechaza notificaciones sin firma o con firma inválida", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1001", approvedPayment("1001", json.orderId, 150));

    expect((await sendWebhook(env.app, "1001", { headers: {} })).status).toBe(401);
    expect((await sendWebhook(env.app, "1001", { headers: signedHeaders("1001", "req-x", "secreto-equivocado") })).status).toBe(401);
    expect((await sendWebhook(env.app, "1001", { headers: signedHeaders("9999") })).status).toBe(401);

    expect(orderStatus(env.db, json.orderId)).toBe("pending");
    expect(env.sent).toHaveLength(0);
  });

  it("con pago aprobado emite los boletos una sola vez y manda el correo", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 2 });
    env.mp.payments.set("1002", approvedPayment("1002", json.orderId, 300));

    const res = await sendWebhook(env.app, "1002");
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe("paid");
    expect(orderStatus(env.db, json.orderId)).toBe("paid");
    expect(countTickets(env.db, json.orderId)).toBe(2);
    expect(env.sent).toHaveLength(1);
    expect(env.sent[0].to).toBe("ana@example.com");
    expect(env.sent[0].tickets).toHaveLength(2);

    const c = await catalog(env.app);
    expect(c.events.find((e) => e.id === FIRST_EVENT)!.available.general).toBe(3);
    const inv = env.db.prepare("SELECT sold, reserved FROM inventory WHERE event_id = ? AND seat_class = 'general'").get(FIRST_EVENT) as { sold: number; reserved: number };
    expect(inv).toMatchObject({ sold: 2, reserved: 0 });
  });

  it("procesa cada notificación una sola vez aunque se repita", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1003", approvedPayment("1003", json.orderId, 150));
    const headers = signedHeaders("1003", "req-repetido");

    const first = await sendWebhook(env.app, "1003", { headers });
    const second = await sendWebhook(env.app, "1003", { headers });
    expect((await first.json()).result).toBe("paid");
    expect((await second.json()).duplicate).toBe(true);
    expect(countTickets(env.db, json.orderId)).toBe(1);
    expect(env.sent).toHaveLength(1);
  });

  it("una notificación distinta del mismo pago tampoco duplica boletos", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1004", approvedPayment("1004", json.orderId, 150));

    await sendWebhook(env.app, "1004");
    const again = await sendWebhook(env.app, "1004");
    expect((await again.json()).result).toBe("already_paid");
    expect(countTickets(env.db, json.orderId)).toBe(1);
    expect(env.sent).toHaveLength(1);
  });

  it("no acepta un pago cuyo monto no coincide con la orden", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1005", approvedPayment("1005", json.orderId, 1));

    const res = await sendWebhook(env.app, "1005");
    expect((await res.json()).result).toBe("amount_mismatch");
    expect(orderStatus(env.db, json.orderId)).toBe("pending");
    expect(countTickets(env.db, json.orderId)).toBe(0);
  });

  it("no emite boletos si el pago no está aprobado", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    for (const [id, status] of [["1006", "rejected"], ["1007", "in_process"], ["1008", "pending"]] as const) {
      env.mp.payments.set(id, approvedPayment(id, json.orderId, 150, status));
      expect((await (await sendWebhook(env.app, id)).json()).result).toBe("not_final");
    }
    expect(orderStatus(env.db, json.orderId)).toBe("pending");
    expect(countTickets(env.db, json.orderId)).toBe(0);
  });

  it("ignora pagos que no pertenecen a ninguna orden y otros tipos de evento", async () => {
    const env = makeEnv();
    env.mp.payments.set("1009", approvedPayment("1009", "no-existe", 150));
    expect((await (await sendWebhook(env.app, "1009")).json()).result).toBe("ignored");
    const other = await sendWebhook(env.app, "1010", { type: "merchant_order" });
    expect(other.status).toBe(200);
    expect((await other.json()).ignored).toBe(true);
  });

  it("si Mercado Pago falla, responde 500 y la reintentan después", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1011", approvedPayment("1011", json.orderId, 150));
    const headers = signedHeaders("1011", "req-reintento");

    env.mp.state.failGetPayment = true;
    expect((await sendWebhook(env.app, "1011", { headers })).status).toBe(500);
    expect(orderStatus(env.db, json.orderId)).toBe("pending");

    env.mp.state.failGetPayment = false;
    const retry = await sendWebhook(env.app, "1011", { headers });
    expect(retry.status).toBe(200);
    expect(orderStatus(env.db, json.orderId)).toBe("paid");
  });

  it("acepta un pago aprobado tarde si todavía hay cupo", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.clock.now = new Date(env.clock.now.getTime() + 20 * 60_000);
    expirePendingOrders(env.db, env.clock.now);
    expect(orderStatus(env.db, json.orderId)).toBe("expired");

    env.mp.payments.set("1012", approvedPayment("1012", json.orderId, 150));
    expect((await (await sendWebhook(env.app, "1012")).json()).result).toBe("paid");
    expect(countTickets(env.db, json.orderId)).toBe(1);
    expect(env.mp.refunds).toHaveLength(0);
  });

  it("reembolsa un pago aprobado tarde si el cupo ya se vendió", async () => {
    const env = makeEnv();
    const late = await checkout(env.app, { tierId: "vip", quantity: 2 });
    env.clock.now = new Date(env.clock.now.getTime() + 20 * 60_000);
    expirePendingOrders(env.db, env.clock.now);
    const winner = await checkout(env.app, { tierId: "vip", quantity: 2 });
    expect(winner.res.status).toBe(200);

    env.mp.payments.set("1013", approvedPayment("1013", late.json.orderId, 1000));
    expect((await (await sendWebhook(env.app, "1013")).json()).result).toBe("refunded_stock_gone");
    expect(env.mp.refunds).toEqual([{ paymentId: "1013", key: "refund-1013" }]);
    expect(orderStatus(env.db, late.json.orderId)).toBe("refunded");
    expect(countTickets(env.db, late.json.orderId)).toBe(0);
    expect(env.sent).toHaveLength(0);
  });

  it("reembolsa un segundo pago de una orden que ya estaba pagada (cobro doble)", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("1014", approvedPayment("1014", json.orderId, 150));
    env.mp.payments.set("1015", approvedPayment("1015", json.orderId, 150));

    await sendWebhook(env.app, "1014");
    const dup = await sendWebhook(env.app, "1015");
    expect((await dup.json()).result).toBe("refunded_duplicate");
    expect(env.mp.refunds).toEqual([{ paymentId: "1015", key: "refund-1015" }]);
    expect(orderStatus(env.db, json.orderId)).toBe("paid");
    expect(countTickets(env.db, json.orderId)).toBe(1);
  });

  it("anula los boletos y libera el cupo cuando el pago se reembolsa", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 2 });
    env.mp.payments.set("1016", approvedPayment("1016", json.orderId, 300));
    await sendWebhook(env.app, "1016");

    env.mp.payments.set("1016", approvedPayment("1016", json.orderId, 300, "refunded"));
    expect((await (await sendWebhook(env.app, "1016")).json()).result).toBe("voided");
    expect(orderStatus(env.db, json.orderId)).toBe("refunded");
    expect((env.db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE order_id = ? AND voided_at IS NOT NULL").get(json.orderId) as { n: number }).n).toBe(2);
    const c = await catalog(env.app);
    expect(c.events.find((e) => e.id === FIRST_EVENT)!.available.general).toBe(5);
  });
});
