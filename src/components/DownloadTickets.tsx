import { useState } from "react";
import { fetchTicket } from "../lib/api";
import { renderTicketsPng, saveImage } from "../lib/ticketImage";

interface Props {
  codes: string[];
  filename?: string;
}

export default function DownloadTickets({ codes, filename }: Props) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const label = codes.length > 1 ? "Descargar boletos" : "Descargar boleto";

  const download = async () => {
    setState("working");
    try {
      const tickets = await Promise.all(codes.map((c) => fetchTicket(c)));
      await saveImage(await renderTicketsPng(tickets), filename ?? "boletos-daneses-dorados.png");
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={download}
        disabled={state === "working"}
        className="inline-flex items-center justify-center gap-2 font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.15em] uppercase bg-[#B4904B] text-[#07030B] px-6 py-3.5 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-wait"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16" />
        </svg>
        {state === "working" ? "Generando imagen…" : label}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-3 text-[13px] text-[#ff9aa6] font-[family-name:var(--font-montserrat)]">
          No pudimos generar la imagen. Haz una captura de pantalla de los códigos QR.
        </p>
      )}
    </div>
  );
}
