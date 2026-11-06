"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GuestSide, GuestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/lib/auth";
import { fmt, getDict } from "@/lib/i18n";
import { isSupportedFile, parseGuestFile, SIDES, STATUSES } from "@/lib/guest-io";
import type { FormState } from "@/actions/auth";
import { opt } from "@/lib/parse";

export type ImportState = { error?: string; message?: string } | undefined;


function readGuest(fd: FormData) {
  const name = opt(fd, "name");
  if (!name) return null;
  const side = String(fd.get("side")) as GuestSide;
  const status = String(fd.get("status")) as GuestStatus;
  const count = Number.parseInt(String(fd.get("invitedCount") ?? "1"), 10);
  return {
    name,
    phone: opt(fd, "phone"),
    group: opt(fd, "group"),
    notes: opt(fd, "notes"),
    side: SIDES.includes(side) ? side : "BOTH",
    status: STATUSES.includes(status) ? status : "PENDING",
    invitedCount: Number.isFinite(count) && count > 0 ? Math.min(count, 999) : 1,
  };
}

/** Guest ids come from the client, so always scope them to an owned event. */
async function requireOwnedGuest(eventId: string, guestId: string) {
  await requireOwnedEvent(eventId);
  const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId } });
  if (!guest) redirect(`/events/${eventId}/guests`);
  return guest;
}

export async function addGuest(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const data = readGuest(fd);
  if (!data) return { error: t.errRequired };
  await prisma.guest.create({ data: { ...data, eventId } });
  revalidatePath(`/events/${eventId}`, "layout");
  return {};
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireOwnedGuest(eventId, guestId);
  const { t } = await getDict();
  const data = readGuest(fd);
  if (!data) return { error: t.errRequired };
  await prisma.guest.update({ where: { id: guestId }, data });
  revalidatePath(`/events/${eventId}`, "layout");
  redirect(`/events/${eventId}/guests`);
}

export async function deleteGuest(eventId: string, guestId: string) {
  await requireOwnedGuest(eventId, guestId);
  await prisma.guest.delete({ where: { id: guestId } });
  revalidatePath(`/events/${eventId}`, "layout");
}

export async function importGuests(eventId: string, _: ImportState, fd: FormData): Promise<ImportState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0 || !isSupportedFile(file)) {
    return { error: t.errBadFile };
  }
  let result;
  try {
    result = await parseGuestFile(file);
  } catch {
    return { error: t.errBadFile };
  }
  if (!result.ok) return { error: t.errNoNameColumn };
  if (result.guests.length) {
    await prisma.guest.createMany({ data: result.guests.map((g) => ({ ...g, eventId })) });
  }
  revalidatePath(`/events/${eventId}`, "layout");
  return { message: fmt(t.importDone, { imported: result.guests.length, skipped: result.skipped }) };
}
