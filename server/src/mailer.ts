import type { Config } from "./config";

export interface TicketEmail {
  to: string;
  buyerName: string;
  orderId: string;
  summary: string;
  tickets: { code: string; url: string }[];
}

export interface Mailer {
  sendTickets(email: TicketEmail): Promise<void>;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderTicketEmail(email: TicketEmail): { subject: string; html: string; text: string } {
  const subject = "Tus boletos de Daneses Dorados Morelos";
  const links = email.tickets.map((t, i) => ({ label: `Boleto ${i + 1}`, url: t.url }));
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#07030B">
  <h2 style="margin-bottom:4px">¡Gracias por tu compra, ${escapeHtml(email.buyerName)}!</h2>
  <p>${escapeHtml(email.summary)}</p>
  <p>Presenta el código QR de cada boleto en la entrada. Cada código se puede usar una sola vez.</p>
  <ul>${links.map((l) => `<li><a href="${escapeHtml(l.url)}">${l.label}</a></li>`).join("")}</ul>
  <p style="color:#666;font-size:12px">Pedido ${escapeHtml(email.orderId)}</p>
</div>`;
  const text = [
    `¡Gracias por tu compra, ${email.buyerName}!`,
    email.summary,
    "Presenta el código QR de cada boleto en la entrada. Cada código se puede usar una sola vez.",
    ...links.map((l) => `${l.label}: ${l.url}`),
    `Pedido ${email.orderId}`,
  ].join("\n\n");
  return { subject, html, text };
}

export function createMailer(cfg: Pick<Config, "RESEND_API_KEY" | "MAIL_FROM" | "isProd">, fetchImpl: typeof fetch = fetch): Mailer {
  if (!cfg.RESEND_API_KEY) {
    return {
      async sendTickets(email) {
        // Los links de los boletos funcionan como contraseña: en producción no se escriben en los registros.
        if (cfg.isProd) {
          console.log(`[mailer] correo no configurado; boletos de la orden ${email.orderId} (${email.tickets.length}) disponibles en la página del pedido`);
          return;
        }
        console.log(`[mailer] RESEND_API_KEY no configurada; boletos para ${email.to}:`);
        for (const t of email.tickets) console.log(`  ${t.url}`);
      },
    };
  }
  const apiKey = cfg.RESEND_API_KEY;
  return {
    async sendTickets(email) {
      const { subject, html, text } = renderTicketEmail(email);
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: cfg.MAIL_FROM, to: [email.to], subject, html, text }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
    },
  };
}
