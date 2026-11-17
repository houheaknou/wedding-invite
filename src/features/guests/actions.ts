"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GuestSide, GuestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { parseGuestFile, SIDES, STATUSES } from "@/features/guests/io";
import { isSupportedFile } from "@/lib/spreadsheet";
import type { FormState } from "@/features/auth/actions";
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

/** Same as updateGuest, for the edit popup on the guests list: stays on the page (the popup closes). */
export async function saveGuestDetails(
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
  return {};
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

/* ───────── spreadsheet-style editing on the guests page (GuestSheet) ───────── */

export type GuestFields = {
  name: string;
  phone: string | null;
  side: GuestSide;
  group: string | null;
  invitedCount: number;
  status: GuestStatus;
  notes: string | null;
};
export type GuestPatch = Partial<GuestFields>;
export type SheetResult = { ok: true } | { ok: false; error: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Check and normalise fields sent from the browser; null when a value is invalid. */
function cleanPatch(p: GuestPatch): GuestPatch | null {
  const out: GuestPatch = {};
  if ("name" in p) {
    const name = text(p.name, 200);
    if (!name) return null;
    out.name = name;
  }
  if ("phone" in p) out.phone = text(p.phone, 40) || null;
  if ("group" in p) out.group = text(p.group, 80) || null;
  if ("notes" in p) out.notes = text(p.notes, 1000) || null;
  if ("side" in p) {
    if (!SIDES.includes(p.side as GuestSide)) return null;
    out.side = p.side;
  }
  if ("status" in p) {
    if (!STATUSES.includes(p.status as GuestStatus)) return null;
    out.status = p.status;
  }
  if ("invitedCount" in p) {
    const n = Math.trunc(Number(p.invitedCount));
    if (!Number.isFinite(n) || n < 1) return null;
    out.invitedCount = Math.min(n, 999);
  }
  return out;
}

/** Quick-add row: one guest from the sheet, no page change. */
export async function quickAddGuest(eventId: string, input: GuestPatch): Promise<SheetResult> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const data = cleanPatch({ side: "BOTH", status: "PENDING", invitedCount: 1, ...input });
  if (!data?.name) return { ok: false, error: t.errRequired };
  await prisma.guest.create({
    data: {
      eventId,
      name: data.name,
      phone: data.phone ?? null,
      group: data.group ?? null,
      side: data.side ?? "BOTH",
      status: data.status ?? "PENDING",
      invitedCount: data.invitedCount ?? 1,
    },
  });
  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true };
}

/** Inline edit: save the one field that changed. */
export async function patchGuest(eventId: string, guestId: string, patch: GuestPatch): Promise<SheetResult> {
  await requireOwnedGuest(eventId, guestId);
  const { t } = await getDict();
  const data = cleanPatch(patch);
  if (!data || Object.keys(data).length === 0) return { ok: false, error: t.errRequired };
  await prisma.guest.update({ where: { id: guestId }, data });
  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true };
}
