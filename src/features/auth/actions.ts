"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, normalizePhone } from "@/features/auth/session";
import { fmt, getDict, LANG_COOKIE, LANGS } from "@/lib/i18n";
import { clear, clientIp, hit, minutes, peek } from "@/lib/rate-limit";
import { str } from "@/lib/parse";

// Attempt limits [review S-2]: failed logins per IP+login and per IP; sign-ups per IP
const LOGIN_FAILS = { perLogin: 5, perIp: 30, windowSec: 15 * 60 };
const SIGNUPS = { perIp: 5, windowSec: 60 * 60 };

export type FormState = { error?: string } | undefined;


/** Split a single "email or phone" input into the matching column. */
function identify(raw: string): { email: string } | { phone: string } {
  return raw.includes("@") ? { email: raw.toLowerCase() } : { phone: normalizePhone(raw) };
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getDict();
  const name = str(fd, "name");
  const loginValue = str(fd, "login");
  const secret = String(fd.get("password") ?? "");
  if (!name || !loginValue) return { error: t.errRequired };
  const ident = identify(loginValue);
  if ("phone" in ident && ident.phone.replace("+", "").length < 6) return { error: t.errEmailOrPhone };
  if (secret.length < 8) return { error: t.errPasswordShort };

  if (await prisma.user.findFirst({ where: ident })) return { error: t.errAccountExists };

  const limit = await hit(`register:${await clientIp()}`, SIGNUPS.perIp, SIGNUPS.windowSec);
  if (!limit.ok) return { error: fmt(t.errTooManyAttempts, { min: minutes(limit.retryAfterSec) }) };

  const user = await prisma.user.create({
    data: { name, ...ident, passwordHash: await bcrypt.hash(secret, 10) },
  });
  await createSession(user.id);
  redirect("/events");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getDict();
  const loginValue = str(fd, "login");
  const secret = String(fd.get("password") ?? "");
  if (!loginValue || !secret) return { error: t.errRequired };

  // Too many recent failures for this login from this IP, or from this IP overall → wait
  const ip = await clientIp();
  const loginKey = `login:${ip}:${loginValue.toLowerCase()}`;
  const ipKey = `login-ip:${ip}`;
  for (const [key, max] of [[loginKey, LOGIN_FAILS.perLogin], [ipKey, LOGIN_FAILS.perIp]] as const) {
    const limit = await peek(key, max);
    if (!limit.ok) return { error: fmt(t.errTooManyAttempts, { min: minutes(limit.retryAfterSec) }) };
  }

  const user = await prisma.user.findFirst({ where: identify(loginValue) });
  // passwordHash is null for Google/Telegram accounts that haven't set a password
  if (!user?.passwordHash || !(await bcrypt.compare(secret, user.passwordHash))) {
    await hit(loginKey, LOGIN_FAILS.perLogin, LOGIN_FAILS.windowSec);
    await hit(ipKey, LOGIN_FAILS.perIp, LOGIN_FAILS.windowSec);
    return { error: t.errBadLogin };
  }
  await clear(loginKey);
  await createSession(user.id);
  redirect("/events");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setLanguage(lang: string) {
  if (!(LANGS as readonly string[]).includes(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
