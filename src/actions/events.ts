"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedEvent, requireUser } from "@/lib/auth";
import { getDict, type Dict } from "@/lib/i18n";
import { parseLocalDateTime } from "@/lib/format";
import { EVENT_TYPES } from "@/lib/constants";
import { deleteMusic } from "@/lib/media";
import { readImage } from "@/lib/file-check";
import type { FormState } from "@/actions/auth";

const COVER_MAX_BYTES = 3 * 1024 * 1024;

const opt = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;

function readEvent(fd: FormData, t: Dict) {
  const groomName = opt(fd, "groomName");
  const brideName = opt(fd, "brideName");
  const date = opt(fd, "date");
  const time = opt(fd, "time");
  if (!groomName || !brideName || !date || !time) return { error: t.errRequired };
  const startsAt = parseLocalDateTime(`${date}T${time}`);
  if (!startsAt) return { error: t.errBadDate };
  const mapUrl = opt(fd, "mapUrl");
  if (mapUrl && !/^https?:\/\//i.test(mapUrl)) return { error: t.errBadUrl };
  const eventType = String(fd.get("eventType")) as EventType;
  return {
    data: {
      title: opt(fd, "title"),
      eventType: EVENT_TYPES.includes(eventType) ? eventType : "WEDDING",
      groomName,
      brideName,
      startsAt,
      venue: opt(fd, "venue"),
      address: opt(fd, "address"),
      mapUrl,
      notes: opt(fd, "notes"),
      agenda: opt(fd, "agenda"),
    },
  };
}

/** Cover photo changes: a new upload, an explicit removal, or nothing. */
async function readCover(fd: FormData, t: Dict) {
  const file = fd.get("cover");
  if (file instanceof File && file.size > 0) {
    const img = await readImage(file, COVER_MAX_BYTES);
    if (!img) return { error: t.errBadImage };
    return { data: { coverImage: img.data, coverImageType: img.type } };
  }
  if (fd.get("removeCover") === "1") return { data: { coverImage: null, coverImageType: null } };
  return { data: {} };
}

export async function createEvent(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { t } = await getDict();
  const parsed = readEvent(fd, t);
  if (!parsed.data) return { error: parsed.error };
  const cover = await readCover(fd, t);
  if (!cover.data) return { error: cover.error };
  const event = await prisma.event.create({
    data: { ...parsed.data, ...cover.data, ownerId: user.id },
    select: { id: true },
  });
  redirect(`/events/${event.id}`);
}

export async function updateEvent(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const parsed = readEvent(fd, t);
  if (!parsed.data) return { error: parsed.error };
  const cover = await readCover(fd, t);
  if (!cover.data) return { error: cover.error };
  await prisma.event.update({ where: { id: eventId }, data: { ...parsed.data, ...cover.data }, select: { id: true } });
  revalidatePath(`/events/${eventId}`, "layout");
  redirect(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  await requireOwnedEvent(eventId);
  const inv = await prisma.invitation.findUnique({ where: { eventId }, select: { musicFile: true } });
  await prisma.event.delete({ where: { id: eventId }, select: { id: true } });
  await deleteMusic(inv?.musicFile);
  revalidatePath("/events");
  redirect("/events");
}
