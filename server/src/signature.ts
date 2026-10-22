import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignatureInput {
  xSignature?: string | null;
  xRequestId?: string | null;
  dataId?: string | null;
  secret: string;
}

export function buildManifest(dataId: string | null | undefined, requestId: string | null | undefined, ts: string): string {
  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  return `${manifest}ts:${ts};`;
}

export function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const out: Record<string, string> = {};
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return { ts: out.ts, v1: out.v1 };
}

export function signManifest(manifest: string, secret: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

// El panel de Mercado Pago da una clave por pestaña (prueba y producción): se pueden listar separadas por coma.
export function parseSecrets(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function verifyWebhookSignatureAny(input: Omit<SignatureInput, "secret">, secrets: string[]): boolean {
  return secrets.map((secret) => verifyWebhookSignature({ ...input, secret })).some(Boolean);
}

export function verifyWebhookSignature(input: SignatureInput): boolean {
  if (!input.xSignature || !input.secret) return false;
  const { ts, v1 } = parseSignatureHeader(input.xSignature);
  if (!ts || !v1) return false;
  const expected = Buffer.from(signManifest(buildManifest(input.dataId, input.xRequestId, ts), input.secret), "utf8");
  const received = Buffer.from(v1.toLowerCase(), "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
