import { useEffect, useState } from "react";
import PageShell, { bodyText, goldButton, pageTitle } from "./PageShell";
import { type TicketView, fetchTicket, formatEventDate } from "../lib/api";

const STATUS_LABEL: Record<TicketView["status"], { text: string; tone: string }> = {
  valid: { text: "Válido", tone: "text-[#7ee2a0] border-[#7ee2a0]/50" },
  used: { text: "Ya utilizado", tone: "text-[#ff9aa6] border-[#ff9aa6]/50" },
  voided: { text: "Anulado", tone: "text-[#ff9aa6] border-[#ff9aa6]/50" },
};

export default function TicketPage({ code }: { code: string }) {
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetchTicket(code).then(setTicket).catch(() => setMissing(true));
  }, [code]);

  if (missing) {
    return (
      <PageShell>
        <h1 className={pageTitle}>Boleto no encontrado</h1>
        <p className={`${bodyText} mt-4`}>Revisa que el enlace esté completo.</p>
        <a href="/" className={`${goldButton} mt-8`}>Ir al inicio</a>
      </PageShell>
    );
  }

  if (!ticket) {
    return (
      <PageShell>
        <p className={bodyText}>Cargando boleto…</p>
      </PageShell>
    );
  }

  const status = STATUS_LABEL[ticket.status];
  const faded = ticket.status !== "valid";

  return (
    <PageShell>
      <div className="max-w-sm mx-auto border border-[#B4904B]/40 bg-[#0d0a11]">
        <div className="p-6 border-b border-[#B4904B]/20">
          <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.25em] uppercase text-[#B4904B]">{ticket.tier.name}</p>
          <h1 className={`${pageTitle} !text-3xl mt-2`}>{ticket.event ? `Daneses vs ${ticket.event.rival}` : "Pase de temporada"}</h1>
          <p className={`${bodyText} mt-2`}>
            {ticket.event ? `${formatEventDate(ticket.event.startsAt)} · ${ticket.event.venue}` : "Válido en todos los partidos en casa, semifinales incluidas."}
          </p>
        </div>

        <div className="p-6 flex flex-col items-center">
          <img
            src={`/api/tickets/${ticket.code}/qr.svg`}
            alt="Código QR de acceso"
            width={240}
            height={240}
            className={`bg-white p-2 ${faded ? "opacity-30" : ""}`}
          />
          <span className={`mt-5 inline-block border px-4 py-1.5 font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.2em] uppercase ${status.tone}`}>
            {status.text}
          </span>
          <p className={`${bodyText} mt-4 text-center`}>{ticket.buyerName}</p>
          {ticket.tier.kind === "pass" && ticket.scans.length > 0 && (
            <p className="mt-2 text-[12px] text-white/40 font-[family-name:var(--font-montserrat)]">Entradas registradas: {ticket.scans.length}</p>
          )}
        </div>
      </div>
      <p className="mt-6 text-center text-[12px] text-white/40 font-[family-name:var(--font-montserrat)]">
        Presenta este código en la entrada. Cada boleto se puede usar una sola vez{ticket.tier.kind === "pass" ? " por partido" : ""}.
      </p>
    </PageShell>
  );
}
