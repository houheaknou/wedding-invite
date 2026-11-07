import "server-only";
import type { PhotoKind } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PHOTO_KINDS: PhotoKind[] = ["GROOM", "BRIDE", "VENUE", "BACKGROUND", "KHQR_USD", "KHQR_KHR"];
// accepted image formats are decided by content: see sniffImage in lib/file-check
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export function parseKind(kind: string): PhotoKind | null {
  const k = kind.toUpperCase() as PhotoKind;
  return PHOTO_KINDS.includes(k) ? k : null;
}

export async function photoResponse(eventId: string, kind: PhotoKind, cache: string) {
  const photo = await prisma.eventPhoto.findUnique({
    where: { eventId_kind: { eventId, kind } },
    select: { data: true, type: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), { headers: { "Content-Type": photo.type, "Cache-Control": cache } });
}
