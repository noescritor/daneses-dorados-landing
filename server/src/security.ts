import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";

const SESSION_TTL_SECONDS = 12 * 60 * 60;

export function signSession(secret: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(secret: string, token: string | undefined, now: Date): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [version, exp, sig] = parts;
  const expected = createHmac("sha256", secret).update(`${version}.${exp}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > Math.floor(now.getTime() / 1000);
}

export function pinMatches(candidate: string, expected: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function clientIp(c: Context): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function rateLimit(opts: { windowMs: number; max: number; now?: () => number }): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const clock = opts.now ?? Date.now;
  return async (c, next) => {
    const t = clock();
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    const key = clientIp(c);
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      hits.set(key, { count: 1, resetAt: t + opts.windowMs });
    } else if (++entry.count > opts.max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return c.json({ error: "too_many_requests" }, 429);
    }
    await next();
  };
}
