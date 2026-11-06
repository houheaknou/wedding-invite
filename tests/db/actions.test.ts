import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { login } from "@/actions/auth";
import { deleteExpense } from "@/actions/expenses";
import { deleteGuest } from "@/actions/guests";
import { submitRsvp } from "@/actions/rsvp";
import { resetDb } from "../support/db";
import { currentRequest, newRequest } from "../support/next-mocks";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function userWithEvent(email: string, password = "correct-horse") {
  const user = await prisma.user.create({ data: { name: email, email, passwordHash: await bcrypt.hash(password, 4) } });
  const event = await prisma.event.create({
    data: { ownerId: user.id, groomName: "Groom", brideName: "Bride", startsAt: new Date("2026-12-20T10:00:00Z") },
  });
  return { user, event };
}

/** Sign in through the real login action; the session cookie lands in the fake browser. */
async function signIn(email: string, password = "correct-horse") {
  await expect(login(undefined, form({ login: email, password }))).rejects.toThrow("REDIRECT /events");
}

beforeEach(async () => {
  await resetDb();
  newRequest();
});

describe("ownership: user A cannot touch user B's event", () => {
  it("deleteExpense / deleteGuest on someone else's event → 404 and nothing deleted", async () => {
    await userWithEvent("a@example.com");
    const b = await userWithEvent("b@example.com");
    const expense = await prisma.expense.create({ data: { eventId: b.event.id, title: "Hall", amount: 1000 } });
    const guest = await prisma.guest.create({ data: { eventId: b.event.id, name: "Guest of B" } });

    await signIn("a@example.com");
    await expect(deleteExpense(b.event.id, expense.id)).rejects.toThrow("NOT_FOUND");
    await expect(deleteGuest(b.event.id, guest.id)).rejects.toThrow("NOT_FOUND");
    expect(await prisma.expense.count()).toBe(1);
    expect(await prisma.guest.count()).toBe(1);
  });

  it("an expense id from another event can't be deleted through your own event", async () => {
    const a = await userWithEvent("a@example.com");
    const b = await userWithEvent("b@example.com");
    const theirs = await prisma.expense.create({ data: { eventId: b.event.id, title: "Hall", amount: 1000 } });
    await signIn("a@example.com");
    await deleteExpense(a.event.id, theirs.id);
    expect(await prisma.expense.count()).toBe(1);
  });

  it("the owner can delete their own expense", async () => {
    const a = await userWithEvent("a@example.com");
    const mine = await prisma.expense.create({ data: { eventId: a.event.id, title: "Cake", amount: 50 } });
    await signIn("a@example.com");
    await deleteExpense(a.event.id, mine.id);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("signed out → sent to the login page", async () => {
    const a = await userWithEvent("a@example.com");
    await expect(deleteExpense(a.event.id, "x")).rejects.toThrow("REDIRECT /login");
  });
});

describe("login attempt limits [review S-2]", () => {
  it("blocks the 6th try after 5 wrong passwords, even with the right password", async () => {
    await userWithEvent("a@example.com");
    for (let i = 0; i < 5; i++) {
      const res = await login(undefined, form({ login: "a@example.com", password: "wrong" }));
      expect(res?.error).toBeTruthy();
    }
    const blocked = await login(undefined, form({ login: "a@example.com", password: "correct-horse" }));
    expect(blocked?.error).toMatch(/\d/); // "try again in N minutes"
    expect(currentRequest().jar.has("session")).toBe(false);
  });

  it("a successful login clears the per-login counter", async () => {
    await userWithEvent("a@example.com");
    for (let i = 0; i < 4; i++) await login(undefined, form({ login: "a@example.com", password: "wrong" }));
    await signIn("a@example.com");
    expect(await prisma.rateLimit.count({ where: { key: { startsWith: "login:" } } })).toBe(0);
  });

  it("another IP is not blocked by someone else's failures", async () => {
    await userWithEvent("a@example.com");
    for (let i = 0; i < 5; i++) await login(undefined, form({ login: "a@example.com", password: "wrong" }));
    newRequest("198.51.100.9");
    await signIn("a@example.com");
  });
});

describe("public RSVP [review S-2, M-4]", () => {
  async function publishedInvite() {
    const { event } = await userWithEvent("owner@example.com");
    return prisma.invitation.create({ data: { eventId: event.id, published: true, showRsvp: true } });
  }
  const reply = (n: number) => form({ name: `Guest ${n}`, phone: `0123456${String(n).padStart(2, "0")}`, answer: "YES", count: "2" });

  it("adds the replying guest to the owner's list", async () => {
    const inv = await publishedInvite();
    expect(await submitRsvp(inv.shareId, null, undefined, reply(1))).toEqual({ ok: true });
    expect(await prisma.guest.findFirst({ where: { eventId: inv.eventId } })).toMatchObject({
      name: "Guest 1",
      group: "RSVP",
      status: "CONFIRMED",
      invitedCount: 2,
    });
  });

  it("limits replies per IP per invitation to 20 an hour", async () => {
    const inv = await publishedInvite();
    for (let i = 0; i < 20; i++) expect(await submitRsvp(inv.shareId, null, undefined, reply(i))).toEqual({ ok: true });
    expect(await submitRsvp(inv.shareId, null, undefined, reply(20))).toEqual({ error: "limit" });
    newRequest("198.51.100.9");
    expect(await submitRsvp(inv.shareId, null, undefined, reply(21))).toEqual({ ok: true });
  });

  it("stops adding anonymous guests at 500 per event", async () => {
    const inv = await publishedInvite();
    await prisma.guest.createMany({ data: Array.from({ length: 500 }, (_, i) => ({ eventId: inv.eventId, name: `G${i}`, group: "RSVP" })) });
    expect(await submitRsvp(inv.shareId, null, undefined, reply(1))).toEqual({ error: "limit" });
  });

  it("refuses replies to an unpublished invitation", async () => {
    const inv = await publishedInvite();
    await prisma.invitation.update({ where: { id: inv.id }, data: { published: false } });
    expect(await submitRsvp(inv.shareId, null, undefined, reply(1))).toEqual({ error: "closed" });
  });
});
