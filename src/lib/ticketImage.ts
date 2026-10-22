import { type TicketView, formatEventDate } from "./api";

const GOLD = "#B4904B";
const BLACK = "#07030B";
const PANEL = "#0d0a11";
const WIDTH = 900;
const PAD = 30;
const CARD_W = WIDTH - PAD * 2;
const CARD_H = 650;
const GAP = 24;
const DISPLAY = "900 {size}px gin, 'Barlow Condensed', Impact, sans-serif";
const BODY = "{weight} {size}px Montserrat, 'Segoe UI', Arial, sans-serif";

const font = (template: string, size: number, weight = 500) => template.replace("{size}", String(size)).replace("{weight}", String(weight));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number): number {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

export async function renderTicketsPng(tickets: TicketView[]): Promise<Blob> {
  await Promise.allSettled([
    document.fonts?.load(font(DISPLAY, 48)),
    document.fonts?.load(font(BODY, 22, 600)),
    document.fonts?.load(font(BODY, 22, 500)),
  ]);
  const [logo, ...qrs] = await Promise.all([loadImage("/logo-daneses.svg"), ...tickets.map((t) => loadImage(`/api/tickets/${t.code}/qr.svg`))]);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = PAD * 2 + tickets.length * CARD_H + (tickets.length - 1) * GAP;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "alphabetic";

  tickets.forEach((ticket, i) => {
    const x = PAD;
    const y = PAD + i * (CARD_H + GAP);
    const left = x + 34;
    const textW = 400;

    ctx.fillStyle = PANEL;
    ctx.fillRect(x, y, CARD_W, CARD_H);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, CARD_W - 3, CARD_H - 3);
    ctx.fillStyle = GOLD;
    ctx.fillRect(x, y, CARD_W, 12);

    ctx.drawImage(logo, left, y + 40, 110, 110);
    ctx.fillStyle = "#fff";
    ctx.font = font(DISPLAY, 38);
    ctx.fillText("DANESES DORADOS", left + 128, y + 90);
    ctx.fillStyle = GOLD;
    ctx.font = font(BODY, 20, 600);
    ctx.fillText("MORELOS", left + 128, y + 124);

    ctx.fillStyle = GOLD;
    ctx.font = font(BODY, 22, 600);
    ctx.fillText(ticket.tier.name.toUpperCase(), left, y + 205);

    ctx.fillStyle = "#fff";
    ctx.font = font(DISPLAY, 50);
    const title = ticket.event ? `DANESES VS ${ticket.event.rival.toUpperCase()}` : "PASE DE TEMPORADA";
    let cursor = drawLines(ctx, wrap(ctx, title, textW), left, y + 262, 54);

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = font(BODY, 22, 500);
    if (ticket.event) {
      cursor = drawLines(ctx, wrap(ctx, formatEventDate(ticket.event.startsAt), textW), left, cursor + 14, 30);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = font(BODY, 19, 500);
      drawLines(ctx, wrap(ctx, ticket.event.venue, textW), left, cursor + 10, 27);
    } else {
      drawLines(ctx, wrap(ctx, "Válido en todos los partidos en casa. Semifinales incluidas.", textW), left, cursor + 14, 30);
    }

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = font(BODY, 19, 500);
    ctx.fillText(`Titular: ${ticket.buyerName}`, left, y + CARD_H - 90);
    ctx.fillStyle = GOLD;
    ctx.font = font(BODY, 19, 600);
    ctx.fillText(`BOLETO ${i + 1} DE ${tickets.length}`, left, y + CARD_H - 58);

    const qrBox = 340;
    const qx = x + CARD_W - qrBox - 34;
    const qy = y + 150;
    ctx.fillStyle = "#fff";
    ctx.fillRect(qx, qy, qrBox, qrBox);
    ctx.drawImage(qrs[i], qx + 10, qy + 10, qrBox - 20, qrBox - 20);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "15px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(ticket.code, qx + qrBox / 2, qy + qrBox + 30);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = font(BODY, 16, 500);
    ctx.fillText("Presenta este QR en la entrada", qx + qrBox / 2, qy + qrBox + 62);
    ctx.fillText(ticket.tier.kind === "pass" ? "Válido una vez por partido" : "Válido una sola vez", qx + qrBox / 2, qy + qrBox + 84);
    ctx.textAlign = "left";
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))), "image/png");
  });
}

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export async function saveImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Boletos Daneses Dorados" });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
