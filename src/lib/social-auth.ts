import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Sign in with Google (OAuth 2.0 code flow, no library) and Telegram (Login Widget).
 * Each provider is switched on by its env vars — see .env.example; the login page only shows
 * the buttons that are configured.
 */

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const telegramBot = () =>
  process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME ? process.env.TELEGRAM_BOT_USERNAME : null;

/** The bot's numeric id: the part of the token before ":" (public — Telegram's login popup needs it). */
export const telegramBotId = () => process.env.TELEGRAM_BOT_TOKEN?.split(":")[0] ?? null;

/** Public origin of this request (works behind a tunnel/proxy); NEXT_PUBLIC_APP_URL wins when set. */
export async function appOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const googleRedirectUri = async () => `${await appOrigin()}/api/auth/google/callback`;

type Profile = { provider: "google" | "telegram"; id: string; name: string; email?: string | null };

/**
 * Google's verified email matches an account that has a password. Sign-up never verifies emails,
 * so joining them automatically would let someone pre-register a victim's email and later share the
 * victim's account (pre-account hijacking) [review S-1]. The owner logs in with the password and links
 * Google from My account instead.
 */
export class LinkRequiresLogin extends Error {}

/** That provider identity already belongs to a different account. */
export class SocialIdTaken extends Error {}

/**
 * The user for a provider identity: already linked → that user; Google with a verified email that
 * matches a password-less (social-only) account → link it; matches a password account → refuse
 * (LinkRequiresLogin); otherwise a new account (no password until set on /account).
 */
export async function userForSocial(p: Profile): Promise<string> {
  const key = p.provider === "google" ? "googleId" : "telegramId";
  const linked = await prisma.user.findUnique({ where: { [key]: p.id } as { googleId: string }, select: { id: true } });
  if (linked) return linked.id;

  if (p.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: p.email }, select: { id: true, passwordHash: true } });
    if (byEmail) {
      if (byEmail.passwordHash) throw new LinkRequiresLogin();
      await prisma.user.update({ where: { id: byEmail.id }, data: { [key]: p.id } });
      return byEmail.id;
    }
  }
  const user = await prisma.user.create({
    data: { name: p.name.slice(0, 120) || "User", email: p.email ?? null, [key]: p.id },
    select: { id: true },
  });
  return user.id;
}

/** Link a provider identity to the signed-in user (from My account), unless another account has it. */
export async function linkSocial(userId: string, p: Profile) {
  const key = p.provider === "google" ? "googleId" : "telegramId";
  const owner = await prisma.user.findUnique({ where: { [key]: p.id } as { googleId: string }, select: { id: true } });
  if (owner && owner.id !== userId) throw new SocialIdTaken();
  await prisma.user.update({ where: { id: userId }, data: { [key]: p.id } });
}

/** Exchange Google's `code` for the signed-in Google profile. */
export async function googleProfile(code: string): Promise<Profile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: await googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) throw new Error(`google token ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!infoRes.ok) throw new Error(`google userinfo ${infoRes.status}`);
  const info = (await infoRes.json()) as { sub: string; name?: string; email?: string; email_verified?: boolean };
  return {
    provider: "google",
    id: info.sub,
    name: info.name ?? info.email?.split("@")[0] ?? "",
    // only a verified email may link to (or claim) an account
    email: info.email && info.email_verified ? info.email.toLowerCase() : null,
  };
}

/**
 * Check a Telegram Login Widget redirect: hash = HMAC-SHA256(data-check-string, SHA256(bot token)),
 * and refuse logins older than an hour [review L-5]: a signed login link works for anyone who has it,
 * so a short window limits replay (login CSRF).
 * https://core.telegram.org/widgets/login#checking-authorization
 */
const TELEGRAM_MAX_AGE_SEC = 60 * 60;

export function telegramProfile(params: URLSearchParams): Profile | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const hash = params.get("hash");
  if (!token || !hash || !params.get("id")) return null;
  const checkString = [...params.entries()]
    .filter(([k]) => k !== "hash")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const age = Date.now() / 1000 - Number(params.get("auth_date"));
  if (!Number.isFinite(age) || age > TELEGRAM_MAX_AGE_SEC) return null;
  const name = [params.get("first_name"), params.get("last_name")].filter(Boolean).join(" ") || params.get("username") || "";
  return { provider: "telegram", id: params.get("id")!, name };
}
