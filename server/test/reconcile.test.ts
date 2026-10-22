import { describe, expect, it } from "vitest";
import { expirePendingOrders } from "../src/orders";
import { approvedPayment, checkout, makeEnv, sendWebhook } from "./helpers";

type Env = ReturnType<typeof makeEnv>;

const getOrder = async (env: Env, id: string) => (await env.app.request(`/api/orders/${id}`)).json();
const countTickets = (env: Env, orderId: string) =>
  (env.db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE order_id = ?").get(orderId) as { n: number }).n;

describe("verificación de respaldo (sin webhook)", () => {
  it("al consultar el pedido confirma un pago aprobado aunque el webhook nunca llegue", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 2 });
    env.mp.payments.set("3001", approvedPayment("3001", json.orderId, 300));

    const order = await getOrder(env, json.orderId);
    expect(order.status).toBe("paid");
    expect(order.tickets).toHaveLength(2);
    expect(env.sent).toHaveLength(1);
  });

  it("consultas repetidas o un webhook posterior no duplican boletos ni correos", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("3002", approvedPayment("3002", json.orderId, 150));

    await getOrder(env, json.orderId);
    env.clock.now = new Date(env.clock.now.getTime() + 10_000);
    await getOrder(env, json.orderId);
    const late = await sendWebhook(env.app, "3002");
    expect((await late.json()).result).toBe("already_paid");

    expect(countTickets(env, json.orderId)).toBe(1);
    expect(env.sent).toHaveLength(1);
  });

  it("no confirma pagos rechazados ni pendientes", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("3003", approvedPayment("3003", json.orderId, 150, "rejected"));
    env.mp.payments.set("3004", approvedPayment("3004", json.orderId, 150, "in_process"));

    expect((await getOrder(env, json.orderId)).status).toBe("pending");
    expect(countTickets(env, json.orderId)).toBe(0);
  });

  it("no confirma un pago cuyo monto no coincide", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("3005", approvedPayment("3005", json.orderId, 1));

    expect((await getOrder(env, json.orderId)).status).toBe("pending");
  });

  it("confirma un pago aprobado aunque la reserva ya haya expirado (si aún hay cupo)", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.clock.now = new Date(env.clock.now.getTime() + 20 * 60_000);
    expirePendingOrders(env.db, env.clock.now);
    env.mp.payments.set("3006", approvedPayment("3006", json.orderId, 150));

    const order = await getOrder(env, json.orderId);
    expect(order.status).toBe("paid");
    expect(order.tickets).toHaveLength(1);
  });

  it("reembolsa si el pago aprobado llega tarde y el cupo ya se vendió", async () => {
    const env = makeEnv();
    const late = await checkout(env.app, { tierId: "vip", quantity: 2 });
    env.clock.now = new Date(env.clock.now.getTime() + 20 * 60_000);
    expirePendingOrders(env.db, env.clock.now);
    await checkout(env.app, { tierId: "vip", quantity: 2 });
    env.mp.payments.set("3007", approvedPayment("3007", late.json.orderId, 1000));

    expect((await getOrder(env, late.json.orderId)).status).toBe("refunded");
    expect(env.mp.refunds).toEqual([{ paymentId: "3007", key: "refund-3007" }]);
  });

  it("limita las consultas a Mercado Pago a una cada 5 segundos por pedido", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });

    await getOrder(env, json.orderId);
    await getOrder(env, json.orderId);
    await getOrder(env, json.orderId);
    expect(env.mp.state.searchCalls).toBe(1);

    env.mp.payments.set("3008", approvedPayment("3008", json.orderId, 150));
    expect((await getOrder(env, json.orderId)).status).toBe("pending");

    env.clock.now = new Date(env.clock.now.getTime() + 6_000);
    expect((await getOrder(env, json.orderId)).status).toBe("paid");
    expect(env.mp.state.searchCalls).toBe(2);
  });

  it("no consulta a Mercado Pago por pedidos que ya están pagados", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.payments.set("3009", approvedPayment("3009", json.orderId, 150));
    await getOrder(env, json.orderId);
    const calls = env.mp.state.searchCalls;

    env.clock.now = new Date(env.clock.now.getTime() + 60_000);
    await getOrder(env, json.orderId);
    expect(env.mp.state.searchCalls).toBe(calls);
  });

  it("si Mercado Pago falla, el pedido igual responde con su estado actual", async () => {
    const env = makeEnv();
    const { json } = await checkout(env.app, { quantity: 1 });
    env.mp.client.searchPaymentsByReference = async () => {
      throw new Error("mp caído");
    };

    const res = await env.app.request(`/api/orders/${json.orderId}`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
  });
});
