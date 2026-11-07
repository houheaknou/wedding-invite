"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { PHOTO_MAX_BYTES } from "@/features/invitation/photos";
import { readImage } from "@/lib/file-check";
import { GALLERY_MAX } from "@/lib/constants";

export type GalleryResult = { ok: true; photo: { id: string; url: string } } | { ok: false; error: string };

/** Adds one gallery photo (the builder uploads them one at a time, already downscaled). */
export async function addGalleryPhoto(eventId: string, fd: FormData): Promise<GalleryResult> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const file = fd.get("photo");
  const img = file instanceof File ? await readImage(file, PHOTO_MAX_BYTES) : null;
  if (!img) return { ok: false, error: t.errBadImage };
  const agg = await prisma.galleryPhoto.aggregate({ where: { eventId }, _count: true, _max: { sort: true } });
  if (agg._count >= GALLERY_MAX) return { ok: false, error: t.galleryFull };
  const photo = await prisma.galleryPhoto.create({
    data: { eventId, data: img.data, type: img.type, sort: (agg._max.sort ?? -1) + 1 },
    select: { id: true },
  });
  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true, photo: { id: photo.id, url: `/api/events/${eventId}/gallery/${photo.id}` } };
}

export async function deleteGalleryPhoto(eventId: string, photoId: string) {
  await requireOwnedEvent(eventId);
  await prisma.galleryPhoto.deleteMany({ where: { id: photoId, eventId } });
  revalidatePath(`/events/${eventId}`, "layout");
}
