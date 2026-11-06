"use server";

import { revalidatePath } from "next/cache";
import type { PhotoKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { parseLocalDateTime } from "@/lib/format";
import { BACKGROUNDS, FONT_STYLES, HEX, INVITE_LANGS, templateById, type InviteLang } from "@/lib/invitation";
import { deleteMusic, ensureInvitation, MUSIC_MAX_BYTES, MUSIC_TYPES, saveMusic } from "@/lib/media";
import { PHOTO_KINDS, PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/lib/photos";

export type SaveState = { error?: string; message?: string; at?: number } | undefined;

const opt = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;
const flag = (fd: FormData, key: string) => fd.get(key) === "1";
const color = (fd: FormData, key: string, fallback: string) => {
  const v = String(fd.get(key) ?? "");
  return HEX.test(v) ? v.toUpperCase() : fallback;
};

/**
 * Saves the whole Invitation Builder form: event details shown on the invitation
 * (names, date, parents, programme, venue), photos, and the invitation's design settings.
 */
export async function saveInvitation(eventId: string, _: SaveState, fd: FormData): Promise<SaveState> {
  const { event } = await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const current = await ensureInvitation(eventId);
  const template = templateById(String(fd.get("template")));
  const lang = String(fd.get("lang")) as InviteLang;

  // --- event details ---
  const groomName = opt(fd, "groomName") ?? event.groomName;
  const brideName = opt(fd, "brideName") ?? event.brideName;
  const date = opt(fd, "date");
  const time = opt(fd, "time");
  const startsAt = date && time ? parseLocalDateTime(`${date}T${time}`) : event.startsAt;
  if (!startsAt) return { error: t.errBadDate };
  const mapUrl = opt(fd, "mapUrl");
  if (mapUrl && !/^https?:\/\//i.test(mapUrl)) return { error: t.errBadUrl };

  // --- photos (validate all before writing anything) ---
  const photoWrites: { kind: PhotoKind; data: Uint8Array<ArrayBuffer>; type: string }[] = [];
  const photoRemovals: PhotoKind[] = [];
  for (const kind of PHOTO_KINDS) {
    const file = fd.get(`photo_${kind}`);
    if (file instanceof File && file.size > 0) {
      if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) return { error: t.errBadImage };
      photoWrites.push({ kind, data: new Uint8Array(await file.arrayBuffer()), type: file.type });
    } else if (flag(fd, `remove_${kind}`)) {
      photoRemovals.push(kind);
    }
  }
  // the cover lives on the event itself, not in EventPhoto
  let coverData = {};
  const cover = fd.get("photo_COVER");
  if (cover instanceof File && cover.size > 0) {
    if (!PHOTO_TYPES.includes(cover.type) || cover.size > PHOTO_MAX_BYTES) return { error: t.errBadImage };
    coverData = { coverImage: new Uint8Array(await cover.arrayBuffer()), coverImageType: cover.type };
  } else if (flag(fd, "remove_COVER")) {
    coverData = { coverImage: null, coverImageType: null };
  }

  // --- music ---
  const music = fd.get("music");
  let musicData = {};
  if (music instanceof File && music.size > 0) {
    if (!MUSIC_TYPES[music.type] || music.size > MUSIC_MAX_BYTES) return { error: t.errBadMusic };
    const name = await saveMusic(eventId, music);
    await deleteMusic(current.musicFile);
    musicData = { musicFile: name, musicName: music.name.slice(0, 120), musicType: music.type };
  } else if (flag(fd, "removeMusic")) {
    await deleteMusic(current.musicFile);
    musicData = { musicFile: null, musicName: null, musicType: null };
  }

  const background = String(fd.get("background"));
  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: {
        groomName,
        brideName,
        startsAt,
        groomNameEn: opt(fd, "groomNameEn"),
        brideNameEn: opt(fd, "brideNameEn"),
        groomParents: opt(fd, "groomParents"),
        groomParentsEn: opt(fd, "groomParentsEn"),
        brideParents: opt(fd, "brideParents"),
        brideParentsEn: opt(fd, "brideParentsEn"),
        agenda: opt(fd, "agenda"),
        venue: opt(fd, "venue"),
        venueEn: opt(fd, "venueEn"),
        address: opt(fd, "address"),
        mapUrl,
        ...coverData,
      },
      select: { id: true },
    }),
    ...photoWrites.map((p) =>
      prisma.eventPhoto.upsert({
        where: { eventId_kind: { eventId, kind: p.kind } },
        create: { eventId, ...p },
        update: { data: p.data, type: p.type },
        select: { id: true },
      }),
    ),
    prisma.eventPhoto.deleteMany({ where: { eventId, kind: { in: photoRemovals } } }),
    prisma.invitation.update({
      where: { eventId },
      data: {
        template: template.id,
        lang: INVITE_LANGS.includes(lang) ? lang : "km",
        published: flag(fd, "published"),
        title: opt(fd, "title"),
        titleEn: opt(fd, "titleEn"),
        titleEnabled: flag(fd, "titleEnabled"),
        titleTop: color(fd, "titleTop", template.colors.titleTop),
        titleBottom: color(fd, "titleBottom", template.colors.titleBottom),
        titleOutline: color(fd, "titleOutline", template.colors.titleOutline),
        message: opt(fd, "message"),
        contactPhones: opt(fd, "contactPhones"),
        lunarDate: opt(fd, "lunarDate"),
        showDetails: flag(fd, "showDetails"),
        showCountdown: flag(fd, "showCountdown"),
        showAgenda: flag(fd, "showAgenda"),
        showParents: flag(fd, "showParents"),
        showMap: flag(fd, "showMap"),
        showRsvp: flag(fd, "showRsvp"),
        showGiftQr: flag(fd, "showGiftQr"),
        giftUsdBank: opt(fd, "giftUsdBank"),
        giftUsdName: opt(fd, "giftUsdName"),
        giftUsdAccount: opt(fd, "giftUsdAccount"),
        giftKhrBank: opt(fd, "giftKhrBank"),
        giftKhrName: opt(fd, "giftKhrName"),
        giftKhrAccount: opt(fd, "giftKhrAccount"),
        themeColor: color(fd, "themeColor", current.themeColor),
        background: (BACKGROUNDS as readonly string[]).includes(background) ? background : "temple",
        fontStyle: (FONT_STYLES as readonly string[]).includes(String(fd.get("fontStyle"))) ? String(fd.get("fontStyle")) : "serif",
        ...musicData,
      },
    }),
  ]);
  revalidatePath(`/events/${eventId}`, "layout");
  return { message: t.saved, at: Date.now() };
}

/** Template gallery: switch the event's invitation to another template (with that template's title colors). */
export async function chooseTemplate(eventId: string, templateId: string) {
  await requireOwnedEvent(eventId);
  await ensureInvitation(eventId);
  const template = templateById(templateId);
  await prisma.invitation.update({ where: { eventId }, data: { template: template.id, ...template.colors } });
  revalidatePath(`/events/${eventId}`, "layout");
}
