import { useEffect, useState } from "react";
import PageShell, { bodyText, goldButton, pageTitle } from "./PageShell";
import { ApiError, type OrderView, fetchOrder, formatEventDate, formatMXN } from "../lib/api";

const POLL_MS = 3000;
const GRACE_AFTER_EXPIRY_MS = 10 * 60_000;

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return (
    <span className="font-mono">
      {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}

export default function OrderPage({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const returned = new URLSearchParams(window.location.search).get("status");

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const current = await fetchOrder(id);
        if (stopped) return;
        setOrder(current);
        const waiting = current.status === "pending" || (current.status === "expired" && Date.now() < new Date(current.reservedUntil).getTime() + GRACE_AFTER_EXPIRY_MS);
        if (!waiting) return;
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
      }
      timer = window.setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  if (notFound) {
    return (
      <PageShell>
        <h1 className={pageTitle}>Pedido no encontrado</h1>
        <p className={`${bodyText} mt-4`}>Revisa que el enlace esté completo.</p>
        <a href="/" className={`${goldButton} mt-8`}>Ir al inicio</a>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <p className={bodyText}>Cargando tu pedido…</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {order.status === "pending" && (
        <>
          <h1 className={pageTitle}>{returned === "failure" ? "El pago no se completó" : "Confirmando tu pago"}</h1>
          <p className={`${bodyText} mt-4`}>
            {returned === "failure"
              ? "Puedes intentarlo de nuevo desde la sección de boletos mientras tu reserva siga vigente."
              : "En cuanto Mercado Pago confirme el pago te mostraremos tus boletos aquí y te los enviaremos por correo. No cierres esta página."}
          </p>
          <p className={`${bodyText} mt-4`}>
            Tu reserva vence en <Countdown until={order.reservedUntil} />
          </p>
          {returned === "failure" && <a href="/#boletos" className={`${goldButton} mt-8`}>Volver a boletos</a>}
        </>
      )}

      {order.status === "paid" && (
        <>
          <h1 className={pageTitle}>¡Pago confirmado!</h1>
          <p className={`${bodyText} mt-4`}>
            {order.quantity > 1 ? `${order.quantity} × ` : ""}
            {order.tierName}
            {order.event ? ` · Daneses vs ${order.event.rival}, ${formatEventDate(order.event.startsAt)}` : " · válido en todos los partidos en casa"} · {formatMXN(order.totalCents)} MXN. Te enviamos una copia a tu correo.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {order.tickets.map((t, i) => (
              <li key={t.code} className="border border-[#B4904B]/30 p-4 flex items-center gap-4">
                <img src={`/api/tickets/${t.code}/qr.svg`} alt={`Código QR del boleto ${i + 1}`} width={96} height={96} className="bg-white p-1" />
                <div>
                  <p className="font-[family-name:var(--font-gin)] font-bold uppercase text-xl leading-none">Boleto {i + 1}</p>
                  <a href={`/t/${t.code}`} className="inline-block mt-2 text-[#B4904B] text-sm underline underline-offset-4">Abrir boleto</a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {order.status === "expired" && (
        <>
          <h1 className={pageTitle}>Tu reserva expiró</h1>
          <p className={`${bodyText} mt-4`}>
            Liberamos tus lugares porque no recibimos el pago a tiempo. Si ya pagaste, espera unos minutos: si aún hay lugares, tus boletos aparecerán aquí y llegarán a tu correo; si no, te reembolsamos automáticamente.
          </p>
          <a href="/#boletos" className={`${goldButton} mt-8`}>Volver a boletos</a>
        </>
      )}

      {order.status === "failed" && (
        <>
          <h1 className={pageTitle}>No se pudo iniciar el pago</h1>
          <p className={`${bodyText} mt-4`}>No se realizó ningún cargo. Puedes intentarlo de nuevo.</p>
          <a href="/#boletos" className={`${goldButton} mt-8`}>Volver a boletos</a>
        </>
      )}

      {order.status === "refunded" && (
        <>
          <h1 className={pageTitle}>Pago reembolsado</h1>
          <p className={`${bodyText} mt-4`}>El pago de este pedido fue reembolsado y los boletos ya no son válidos.</p>
          <a href="/#boletos" className={`${goldButton} mt-8`}>Volver a boletos</a>
        </>
      )}
    </PageShell>
  );
}
