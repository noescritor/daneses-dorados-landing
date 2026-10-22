const API_BASE = "https://api.mercadopago.com";

export class MpApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface MpPayment {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id: string;
}

export interface PreferenceInput {
  orderId: string;
  tierId: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  buyerEmail: string;
  buyerName: string;
  baseUrl: string;
  now: Date;
  expiresAt: Date;
}

export interface MercadoPagoClient {
  createPreference(input: PreferenceInput): Promise<{ id: string; initPoint: string }>;
  getPayment(paymentId: string): Promise<MpPayment>;
  searchPaymentsByReference(externalReference: string): Promise<MpPayment[]>;
  refundPayment(paymentId: string, idempotencyKey: string): Promise<void>;
}

const toMpDate = (d: Date) => d.toISOString().replace("Z", "+00:00");

// Los pagos offline (OXXO, SPEI, cajeros) no caben en la ventana de reserva.
const EXCLUDED_PAYMENT_TYPES = [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }];

export function buildPreferenceBody(input: PreferenceInput): Record<string, unknown> {
  const isHttps = input.baseUrl.startsWith("https://");
  const orderUrl = (status: string) => `${input.baseUrl}/pedido/${input.orderId}?status=${status}`;
  return {
    items: [
      {
        id: input.tierId,
        title: input.title,
        quantity: input.quantity,
        unit_price: input.unitPriceCents / 100,
        currency_id: "MXN",
      },
    ],
    payer: { email: input.buyerEmail, name: input.buyerName },
    external_reference: input.orderId,
    back_urls: { success: orderUrl("success"), failure: orderUrl("failure"), pending: orderUrl("pending") },
    ...(isHttps
      ? {
          auto_return: "approved",
          notification_url: `${input.baseUrl}/api/webhooks/mercadopago?source_news=webhooks`,
        }
      : {}),
    binary_mode: true,
    expires: true,
    expiration_date_from: toMpDate(input.now),
    expiration_date_to: toMpDate(input.expiresAt),
    payment_methods: { excluded_payment_types: EXCLUDED_PAYMENT_TYPES },
    statement_descriptor: "DANESES DORADOS",
  };
}

export function createMpClient(accessToken: string, fetchImpl: typeof fetch = fetch): MercadoPagoClient {
  async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetchImpl(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!res.ok) throw new MpApiError(res.status, `Mercado Pago ${method} ${path} respondió ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  }

  return {
    async createPreference(input) {
      const data = await call("POST", "/checkout/preferences", buildPreferenceBody(input));
      return { id: String(data.id), initPoint: String(data.init_point) };
    },
    async getPayment(paymentId) {
      if (!/^\d{1,20}$/.test(paymentId)) throw new MpApiError(400, "payment id inválido");
      return (await call("GET", `/v1/payments/${paymentId}`)) as MpPayment;
    },
    async searchPaymentsByReference(externalReference) {
      if (!/^[0-9a-f-]{36}$/i.test(externalReference)) throw new MpApiError(400, "referencia inválida");
      const data = await call("GET", `/v1/payments/search?external_reference=${externalReference}&sort=date_created&criteria=desc&limit=10`);
      return (data.results ?? []) as MpPayment[];
    },
    async refundPayment(paymentId, idempotencyKey) {
      if (!/^\d{1,20}$/.test(paymentId)) throw new MpApiError(400, "payment id inválido");
      await call("POST", `/v1/payments/${paymentId}/refunds`, {}, { "X-Idempotency-Key": idempotencyKey });
    },
  };
}
