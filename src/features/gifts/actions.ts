"use server";

import { revalidatePath } from "next/cache";
import type { GiftMethod, GuestSide } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { GIFT_CURRENCIES, GIFT_METHODS, GIFT_SIDES, giftTotals } from "@/features/gifts/shared";
import { formatMoney } from "@/features/expenses/shared";
import { parseGiftFile } from "@/features/gifts/io";
import { isSupportedFile } from "@/lib/spreadsheet";
import type { FormState } from "@/features/auth/actions";
import type { ImportState } from "@/features/guests/actions";
import { money, opt } from "@/lib/parse";

/** Same name as someone on the guest list → link the gift to that guest (and take their side if none given) */
async function matchGuest(eventId: string, name: string) {
  return prisma.guest.findFirst({
    where: { eventId, name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true, side: true },
  });
}

async function readGift(eventId: string, fd: FormData) {
  const name = opt(fd, "name", 120);
  const amount = money(fd, "amount", { allowZero: false });
  if (!name || amount === null) return null;
  const currency = String(fd.get("currency"));
  const side = String(fd.get("side")) as GuestSide;
  const method = String(fd.get("method")) as GiftMethod;
  const guest = await matchGuest(eventId, name);
  return {
    name,
    amount,
    currency: (GIFT_CURRENCIES as readonly string[]).includes(currency) ? currency : "USD",
    side: GIFT_SIDES.includes(side) ? side : (guest?.side ?? "BOTH"),
    method: GIFT_METHODS.includes(method) ? method : "CASH",
    notes: opt(fd, "notes", 500),
    guestId: guest?.id ?? null,
  };
}

const refresh = (eventId: string) => revalidatePath(`/events/${eventId}`, "layout");

export async function addGift(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const data = await readGift(eventId, fd);
  if (!data) return { error: t.errGift };
  await prisma.gift.create({ data: { ...data, eventId } });
  refresh(eventId);
  return {};
}

export async function updateGift(eventId: string, giftId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  if (!(await prisma.gift.findFirst({ where: { id: giftId, eventId }, select: { id: true } }))) return { error: t.errRequired };
  const data = await readGift(eventId, fd);
  if (!data) return { error: t.errGift };
  await prisma.gift.update({ where: { id: giftId }, data });
  refresh(eventId);
  return {};
}

export async function deleteGift(eventId: string, giftId: string) {
  await requireOwnedEvent(eventId);
  await prisma.gift.deleteMany({ where: { id: giftId, eventId } });
  refresh(eventId);
}

/** Gift list (.xlsx/.csv) → gifts, added to the list or replacing it */
export async function importGifts(eventId: string, _: ImportState, fd: FormData): Promise<ImportState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0 || !isSupportedFile(file)) return { error: t.errBadFile };
  let result;
  try {
    result = await parseGiftFile(file);
  } catch {
    return { error: t.errBadFile };
  }
  if (!result.ok) return { error: t.errNoGiftColumns };

  // Link to guests by name, as when adding one by hand
  const guests = await prisma.guest.findMany({ where: { eventId }, select: { id: true, name: true, side: true } });
  const byName = new Map(guests.map((g) => [g.name.trim().toLowerCase(), g]));
  const data = result.gifts.map((g) => {
    const guest = byName.get(g.name.trim().toLowerCase());
    return { ...g, eventId, guestId: guest?.id ?? null, side: g.side ?? guest?.side ?? "BOTH" };
  });
  const replace = fd.get("replace") === "on";
  await prisma.$transaction([
    ...(replace ? [prisma.gift.deleteMany({ where: { eventId } })] : []),
    prisma.gift.createMany({ data }),
  ]);
  refresh(eventId);
  const { usd, khr } = giftTotals(result.gifts);
  const total = [usd && formatMoney(usd, "USD"), khr && formatMoney(khr, "KHR")].filter(Boolean).join(" + ") || "0";
  return { message: fmt(t.giftImportDone, { n: result.gifts.length, total }) };
}
