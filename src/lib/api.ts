export interface CatalogTier {
  id: string;
  name: string;
  kind: "single" | "pass";
  seatClass: "general" | "vip";
  priceCents: number;
}

export interface CatalogEvent {
  id: string;
  rival: string;
  venue: string;
  startsAt: string;
  stage: string;
  available: { general: number; vip: number };
}

export interface Catalog {
  tiers: CatalogTier[];
  events: CatalogEvent[];
  passAvailable: { general: number; vip: number };
  limits: { maxQuantity: number; reservationMinutes: number };
}

export interface OrderView {
  id: string;
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  tierName: string;
  quantity: number;
  totalCents: number;
  reservedUntil: string;
  event: { rival: string; venue: string; startsAt: string } | null;
  tickets: { code: string }[];
}

export interface TicketView {
  code: string;
  tier: { id: string; name: string; kind: "single" | "pass"; seatClass: "general" | "vip" };
  event: { id: string; rival: string; venue: string; startsAt: string } | null;
  buyerName: string;
  status: "valid" | "used" | "voided";
  scans: { eventId: string; scannedAt: string }[];
}

export type ScanResult =
  | { result: "ok"; tierName: string; buyerName: string; kind: "single" | "pass" }
  | { result: "already_used"; scannedAt: string; tierName: string; buyerName: string }
  | { result: "wrong_event"; ticketEventId: string | null }
  | { result: "voided" }
  | { result: "invalid" };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

const MESSAGES: Record<string, string> = {
  sold_out: "Ya no quedan lugares suficientes para tu selección.",
  not_on_sale: "Este partido ya no está disponible para venta.",
  invalid_quantity: "La cantidad seleccionada no es válida.",
  invalid_request: "Revisa tus datos e inténtalo de nuevo.",
  too_many_requests: "Demasiados intentos. Espera un minuto e inténtalo otra vez.",
  payments_not_configured: "Los pagos no están disponibles por el momento.",
  payment_provider_error: "No pudimos conectar con Mercado Pago. Inténtalo de nuevo en un momento.",
  order_not_pending: "Tu reserva anterior ya no está vigente. Vuelve a intentarlo.",
  unauthorized: "Tu sesión expiró. Vuelve a entrar.",
  invalid_pin: "PIN incorrecto.",
};

export const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? (MESSAGES[err.code] ?? "Ocurrió un error. Inténtalo de nuevo.") : "No hay conexión con el servidor.";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, typeof data.error === "string" ? data.error : "unknown");
  return data as T;
}

export const fetchCatalog = () => request<Catalog>("/api/catalog");
export const fetchOrder = (id: string) => request<OrderView>(`/api/orders/${id}`);
export const fetchTicket = (code: string) => request<TicketView>(`/api/tickets/${code}`);

export interface CheckoutRequest {
  tierId: string;
  eventId: string | null;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  idempotencyKey: string;
}

export const startCheckout = (body: CheckoutRequest) =>
  request<{ orderId: string; initPoint: string; reservedUntil: string }>("/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const staffLogin = (pin: string) => request<{ ok: true }>("/api/staff/login", { method: "POST", body: JSON.stringify({ pin }) });
export const staffLogout = () => request<{ ok: true }>("/api/staff/logout", { method: "POST" });
export const fetchStaffEvents = () => request<{ events: { id: string; rival: string; startsAt: string; stage: string }[] }>("/api/staff/events");
export const scanCode = (code: string, eventId: string) =>
  request<ScanResult>("/api/staff/scan", { method: "POST", body: JSON.stringify({ code, eventId }) });

export const formatMXN = (cents: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(cents / 100);

export const formatEventDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mexico_City" }).format(
    new Date(iso),
  );
