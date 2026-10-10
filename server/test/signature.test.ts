import { describe, expect, it } from "vitest";
import { buildManifest, signManifest, verifyWebhookSignature } from "../src/signature";

const secret = "whsec_unit_test";
const ts = "1742505638683";

function header(dataId: string | null, requestId: string | null, key = secret) {
  return `ts=${ts},v1=${signManifest(buildManifest(dataId, requestId, ts), key)}`;
}

describe("verifyWebhookSignature", () => {
  it("acepta una firma válida", () => {
    expect(verifyWebhookSignature({ xSignature: header("123", "req-1"), xRequestId: "req-1", dataId: "123", secret })).toBe(true);
  });

  it("usa el manifest documentado id;request-id;ts", () => {
    expect(buildManifest("123", "req-1", ts)).toBe(`id:123;request-id:req-1;ts:${ts};`);
    expect(buildManifest("123", null, ts)).toBe(`id:123;ts:${ts};`);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    expect(verifyWebhookSignature({ xSignature: header("123", "req-1", "otro"), xRequestId: "req-1", dataId: "123", secret })).toBe(false);
  });

  it("rechaza si cambia el id del pago", () => {
    expect(verifyWebhookSignature({ xSignature: header("123", "req-1"), xRequestId: "req-1", dataId: "124", secret })).toBe(false);
  });

  it("rechaza si cambia el request-id", () => {
    expect(verifyWebhookSignature({ xSignature: header("123", "req-1"), xRequestId: "req-2", dataId: "123", secret })).toBe(false);
  });

  it("rechaza cabeceras ausentes o mal formadas", () => {
    expect(verifyWebhookSignature({ xSignature: null, xRequestId: "req-1", dataId: "123", secret })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: "basura", xRequestId: "req-1", dataId: "123", secret })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: `ts=${ts}`, xRequestId: "req-1", dataId: "123", secret })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: `ts=${ts},v1=`, xRequestId: "req-1", dataId: "123", secret })).toBe(false);
  });
});
