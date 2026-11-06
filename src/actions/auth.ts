"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, normalizePhone } from "@/lib/auth";
import { getDict, LANG_COOKIE, LANGS } from "@/lib/i18n";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

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

  const user = await prisma.user.findFirst({ where: identify(loginValue) });
  // passwordHash is null for Google/Telegram accounts that haven't set a password
  if (!user?.passwordHash || !(await bcrypt.compare(secret, user.passwordHash))) {
    return { error: t.errBadLogin };
  }
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
