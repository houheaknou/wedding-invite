import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { linkSocial, LinkRequiresLogin, SocialIdTaken, userForSocial } from "@/lib/social-auth";
import { resetDb } from "../support/db";

const google = (id: string, email: string | null = null) => ({ provider: "google" as const, id, name: "Sok Dara", email });

// Review S-1: Google never joins an account that has a password just because the email matches
describe("social sign-in linking", () => {
  beforeEach(resetDb);

  it("refuses to join a password account by email (pre-account hijacking)", async () => {
    await prisma.user.create({ data: { name: "Owner", email: "dara@example.com", passwordHash: "x" } });
    await expect(userForSocial(google("g-1", "dara@example.com"))).rejects.toBeInstanceOf(LinkRequiresLogin);
    expect(await prisma.user.count({ where: { googleId: "g-1" } })).toBe(0);
  });

  it("links to a password-less (social-only) account with the same verified email", async () => {
    const tg = await prisma.user.create({ data: { name: "Dara", email: "dara@example.com", telegramId: "tg-1" } });
    expect(await userForSocial(google("g-1", "dara@example.com"))).toBe(tg.id);
    expect((await prisma.user.findUnique({ where: { id: tg.id } }))?.googleId).toBe("g-1");
  });

  it("returns the already-linked account", async () => {
    const u = await prisma.user.create({ data: { name: "Dara", googleId: "g-1", passwordHash: "x" } });
    expect(await userForSocial(google("g-1", "other@example.com"))).toBe(u.id);
  });

  it("creates a new password-less account otherwise", async () => {
    const id = await userForSocial(google("g-2", null));
    expect(await prisma.user.findUnique({ where: { id }, select: { googleId: true, passwordHash: true } })).toEqual({
      googleId: "g-2",
      passwordHash: null,
    });
  });

  it("linkSocial attaches the identity to the signed-in user, but not one owned by someone else", async () => {
    const me = await prisma.user.create({ data: { name: "Me", email: "me@example.com", passwordHash: "x" } });
    const other = await prisma.user.create({ data: { name: "Other", googleId: "g-other" } });
    await linkSocial(me.id, google("g-me"));
    expect((await prisma.user.findUnique({ where: { id: me.id } }))?.googleId).toBe("g-me");
    await expect(linkSocial(me.id, google("g-other"))).rejects.toBeInstanceOf(SocialIdTaken);
    expect((await prisma.user.findUnique({ where: { id: other.id } }))?.googleId).toBe("g-other");
  });
});
