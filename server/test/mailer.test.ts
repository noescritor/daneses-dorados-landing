import { afterEach, describe, expect, it, vi } from "vitest";
import { createMailer } from "../src/mailer";

const email = {
  to: "ana@example.com",
  buyerName: "Ana",
  orderId: "orden-123",
  summary: "General",
  tickets: [{ code: "SECRETO-DEL-BOLETO", url: "https://sitio.test/t/SECRETO-DEL-BOLETO" }],
};

afterEach(() => vi.restoreAllMocks());

describe("correo de boletos sin proveedor configurado", () => {
  it("en producción no escribe en los registros ni el correo ni los links de los boletos", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await createMailer({ RESEND_API_KEY: undefined, MAIL_FROM: "x", isProd: true }).sendTickets(email);
    const output = log.mock.calls.flat().join(" ");
    expect(output).toContain("orden-123");
    expect(output).not.toContain("SECRETO-DEL-BOLETO");
    expect(output).not.toContain("ana@example.com");
  });

  it("en desarrollo imprime los links para poder probar", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await createMailer({ RESEND_API_KEY: undefined, MAIL_FROM: "x", isProd: false }).sendTickets(email);
    expect(log.mock.calls.flat().join(" ")).toContain("https://sitio.test/t/SECRETO-DEL-BOLETO");
  });
});
