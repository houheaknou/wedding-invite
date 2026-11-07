import "server-only";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { Event, Invitation, PhotoKind } from "@prisma/client";
import { del } from "@vercel/blob";
import { sniffAudio, type AudioFormat } from "@/lib/file-check";
import { prisma } from "@/lib/db";
import type { InvitationData, InviteLang, TemplateId } from "@/features/invitation/shared";

/**
 * Where songs live. On Vercel (BLOB_READ_WRITE_TOKEN set) the browser uploads straight to Vercel
 * Blob (see api/events/[id]/music/upload) and Invitation.musicFile holds the blob's https URL;
 * Vercel's disk is read-only and its requests are capped at 4.5 MB. Elsewhere (this PC, Docker)
 * songs go through the save form onto local disk and musicFile holds the file name.
 */
const MUSIC_DIR = path.join(process.cwd(), "uploads", "music");
export const blobMusicEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const isBlobUrl = (s: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(s);
/** Blob path of an event's songs: the upload route only hands out tokens under it. */
export const musicBlobPrefix = (eventId: string) => `music/${eventId}/`;

/**
 * A song the browser uploaded to Blob: it must be in our store, under this event's folder, and its
 * first bytes must be real audio (sniffAudio, same rule as disk uploads). Null otherwise.
 */
export async function checkBlobSong(eventId: string, url: string): Promise<AudioFormat | null> {
  if (!isBlobUrl(url) || !new URL(url).pathname.startsWith(`/${musicBlobPrefix(eventId)}`)) return null;
  const res = await fetch(url, { headers: { Range: "bytes=0-63" }, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  return sniffAudio(new Uint8Array(await res.arrayBuffer()));
}
// accepted formats are decided by content: see sniffAudio in lib/file-check
export const MUSIC_MAX_BYTES = 10 * 1024 * 1024;

/** Store an already-checked song (see readAudio in lib/file-check) under a server-made name. */
export async function saveMusic(eventId: string, data: Uint8Array, ext: string) {
  await mkdir(MUSIC_DIR, { recursive: true });
  const name = `${eventId}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(MUSIC_DIR, name), data);
  return name;
}

export async function deleteMusic(name: string | null | undefined) {
  if (name && isBlobUrl(name)) return void (await del(name).catch(() => {}));
  if (!name || name.includes("/") || name.includes("\\")) return;
  await unlink(path.join(MUSIC_DIR, name)).catch(() => {});
}

/** Stream an uploaded music file, honouring Range requests so the player can seek. */
export async function serveMusic(name: string, type: string, req: Request) {
  // Blob songs: the CDN serves them (with Range support) from their unguessable URL
  if (isBlobUrl(name)) return Response.redirect(name, 302);
  if (name.includes("/") || name.includes("\\")) return new Response("Not found", { status: 404 });
  const file = path.join(MUSIC_DIR, name);
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(body, { headers: { ...headers, "Content-Length": String(info.size) } });
}

/** The event's invitation settings, created with defaults on first use. */
export function ensureInvitation(eventId: string) {
  // New invitations start on the Royal gold template
  return prisma.invitation.upsert({ where: { eventId }, update: {}, create: { eventId, template: "royal" } });
}

type EventFields = Pick<
  Event,
  | "groomName"
  | "brideName"
  | "startsAt"
  | "venue"
  | "address"
  | "mapUrl"
  | "agenda"
  | "groomNameEn"
  | "brideNameEn"
  | "groomParents"
  | "groomParentsEn"
  | "brideParents"
  | "brideParentsEn"
  | "venueEn"
>;

export type MediaUrls = {
  coverUrl: string | null;
  musicUrl: string | null;
  groomPhotoUrl: string | null;
  bridePhotoUrl: string | null;
  venuePhotoUrl: string | null;
  backgroundUrl: string | null;
  khqrUsdUrl: string | null;
  khqrKhrUrl: string | null;
  galleryUrls: string[];
};

/** Gallery photo URLs under a base path (owner: /api/events/<id>, public: /api/invite/<shareId>). */
export function galleryUrls(base: string, photos: { id: string }[]) {
  return photos.map((p) => `${base}/gallery/${p.id}`);
}

/** URLs for an event's photos under a base path (owner: /api/events/<id>, public: /api/invite/<shareId>). */
export function photoUrls(base: string, photos: { kind: PhotoKind; updatedAt: Date }[]) {
  const url = (kind: PhotoKind) => {
    const p = photos.find((x) => x.kind === kind);
    return p ? `${base}/photo/${kind.toLowerCase()}?v=${p.updatedAt.getTime()}` : null;
  };
  return {
    groomPhotoUrl: url("GROOM"),
    bridePhotoUrl: url("BRIDE"),
    venuePhotoUrl: url("VENUE"),
    backgroundUrl: url("BACKGROUND"),
    khqrUsdUrl: url("KHQR_USD"),
    khqrKhrUrl: url("KHQR_KHR"),
  };
}

export function toInvitationData(
  event: EventFields,
  inv: Invitation,
  urls: MediaUrls,
  guestName: string | null = null,
  rsvp: InvitationData["rsvp"] = null,
): InvitationData {
  return {
    template: inv.template as TemplateId,
    lang: inv.lang as InviteLang,
    title: inv.title,
    titleEn: inv.titleEn,
    titleEnabled: inv.titleEnabled,
    titleTop: inv.titleTop,
    titleBottom: inv.titleBottom,
    titleOutline: inv.titleOutline,
    message: inv.message,
    showDetails: inv.showDetails,
    showCountdown: inv.showCountdown,
    showAgenda: inv.showAgenda,
    showParents: inv.showParents,
    showMap: inv.showMap,
    showRsvp: inv.showRsvp,
    themeColor: inv.themeColor,
    background: inv.background,
    fontStyle: inv.fontStyle,
    contactPhones: inv.contactPhones,
    lunarDate: inv.lunarDate,
    showGiftQr: inv.showGiftQr,
    giftUsdBank: inv.giftUsdBank,
    giftUsdName: inv.giftUsdName,
    giftUsdAccount: inv.giftUsdAccount,
    giftKhrBank: inv.giftKhrBank,
    giftKhrName: inv.giftKhrName,
    giftKhrAccount: inv.giftKhrAccount,
    ...urls,
    groomName: event.groomName,
    brideName: event.brideName,
    groomNameEn: event.groomNameEn,
    brideNameEn: event.brideNameEn,
    groomParents: event.groomParents,
    groomParentsEn: event.groomParentsEn,
    brideParents: event.brideParents,
    brideParentsEn: event.brideParentsEn,
    startsAt: event.startsAt.toISOString(),
    venue: event.venue,
    venueEn: event.venueEn,
    address: event.address,
    mapUrl: event.mapUrl,
    agenda: event.agenda,
    guestName,
    rsvp,
  };
}
