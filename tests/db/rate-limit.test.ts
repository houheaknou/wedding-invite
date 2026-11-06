import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { clear, hit, peek } from "@/lib/rate-limit";
import { resetDb } from "../support/db";

// Review S-2: fixed-window counters in Postgres
describe("rate limiter", () => {
  beforeEach(resetDb);

  it("allows up to max attempts in a window, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await hit("k", 3, 60)).ok);
    expect(results).toEqual([true, true, true, false]);
  });

  it("reports how long until the window resets", async () => {
    const r = await hit("k", 1, 600);
    expect(r.retryAfterSec).toBeGreaterThan(590);
    expect(r.retryAfterSec).toBeLessThanOrEqual(600);
  });

  it("counts every attempt exactly once under concurrency (atomic upsert)", async () => {
    await Promise.all(Array.from({ length: 25 }, () => hit("burst", 100, 60)));
    const row = await prisma.rateLimit.findUnique({ where: { key: "burst" } });
    expect(row?.count).toBe(25);
  });

  it("starts a new window once the old one has ended", async () => {
    for (let i = 0; i < 3; i++) await hit("k", 2, 60);
    // end the window on the database clock (it can differ from this machine's by a second)
    await prisma.$executeRaw`UPDATE "RateLimit" SET "resetAt" = now() - interval '1 second' WHERE "key" = 'k'`;
    expect((await hit("k", 2, 60)).ok).toBe(true);
    expect((await prisma.rateLimit.findUnique({ where: { key: "k" } }))?.count).toBe(1);
  });

  it("peek does not count, and blocks once the count reaches max", async () => {
    expect((await peek("k", 2)).ok).toBe(true);
    await hit("k", 2, 60);
    expect((await peek("k", 2)).ok).toBe(true);
    await hit("k", 2, 60);
    expect((await peek("k", 2)).ok).toBe(false);
    expect((await prisma.rateLimit.findUnique({ where: { key: "k" } }))?.count).toBe(2);
  });

  it("clear forgets a key; keys are independent", async () => {
    await hit("a", 1, 60);
    await hit("a", 1, 60);
    await hit("b", 1, 60);
    await clear("a");
    expect((await hit("a", 1, 60)).ok).toBe(true);
    expect((await hit("b", 1, 60)).ok).toBe(false);
  });
});
