"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { destroyOtherSessions, normalizePhone, requireUser } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { str } from "@/lib/parse";

export type AccountState = { ok?: boolean; error?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Name, email and phone of the signed-in user. Email or phone is the login, so one must stay. */
export async function updateProfile(_: AccountState, fd: FormData): Promise<AccountState> {
  const user = await requireUser();
  const { t } = await getDict();
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200).toLowerCase() || null;
  const phoneRaw = str(fd, "phone", 40);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  if (!name) return { error: t.errRequired };
  // email/phone is the password login; Google/Telegram accounts can sign in without either
  const links = await prisma.user.findUnique({ where: { id: user.id }, select: { googleId: true, telegramId: true } });
  if (!email && !phone && !links?.googleId && !links?.telegramId) return { error: t.errNeedLogin };
  if (email && !EMAIL.test(email)) return { error: t.errBadEmail };
  if (phone && phone.replace("+", "").length < 6) return { error: t.errBadPhone };

  const others = { id: { not: user.id } };
  if (email && (await prisma.user.findFirst({ where: { email, ...others }, select: { id: true } }))) {
    return { error: t.errEmailTaken };
  }
  if (phone && (await prisma.user.findFirst({ where: { phone, ...others }, select: { id: true } }))) {
    return { error: t.errPhoneTaken };
  }

  await prisma.user.update({ where: { id: user.id }, data: { name, email, phone } });
  revalidatePath("/", "layout"); // header avatar + menu show the new name
  return { ok: true };
}

/**
 * Needs the current password — except for a Google/Telegram account that has none yet, which sets
 * its first one. Other browsers/devices are signed out afterwards.
 */
export async function changePassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const user = await requireUser();
  const { t } = await getDict();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row) return { error: t.errRequired };
  if ((row.passwordHash && !current) || !next || !confirm) return { error: t.errRequired };
  if (next.length < 8) return { error: t.errPasswordShort };
  if (next !== confirm) return { error: t.errPasswordMismatch };
  if (row.passwordHash && !(await bcrypt.compare(current, row.passwordHash))) return { error: t.errWrongPassword };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await destroyOtherSessions(user.id);
  return { ok: true };
}
