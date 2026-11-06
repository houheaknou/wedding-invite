import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window attempt counters kept in Postgres (table "RateLimit") [review S-2], so limits hold
 * across restarts and across several app containers. Each call is one atomic statement; all SQL is
 * parameterised (Prisma tagged templates).
 */

export type Limit = { ok: boolean; retryAfterSec: number };

/** Best-effort client IP: Cloudflare / reverse proxy headers first. */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  ).slice(0, 64);
}

const secondsLeft = (resetAt: Date) => Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));

/** Count one attempt for `key`; ok while the window's count is ≤ `max`. */
export async function hit(key: string, max: number, windowSec: number): Promise<Limit> {
  const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + make_interval(secs => ${windowSec}) ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  if (Math.random() < 0.02) void sweep();
  return { ok: row.count <= max, retryAfterSec: secondsLeft(row.resetAt) };
}

/** Whether `key` is already over `max` in its current window (does not count an attempt). */
export async function peek(key: string, max: number): Promise<Limit> {
  const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    SELECT "count", "resetAt" FROM "RateLimit" WHERE "key" = ${key} AND "resetAt" > now()`;
  return row && row.count >= max ? { ok: false, retryAfterSec: secondsLeft(row.resetAt) } : { ok: true, retryAfterSec: 0 };
}

/** Forget `key` (e.g. after a successful login). */
export async function clear(key: string) {
  await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${key}`;
}

/** Drop rows whose window ended more than a day ago. */
async function sweep() {
  await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < now() - interval '1 day'`.catch(() => {});
}

export const minutes = (sec: number) => Math.max(1, Math.ceil(sec / 60));
