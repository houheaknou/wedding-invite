import { addGalleryPhoto, deleteGalleryPhoto } from "@/features/invitation/gallery-actions";
import { saveInvitation } from "@/features/invitation/actions";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { coverUrl, toLocalInputValue } from "@/lib/format";
import { parseAgenda } from "@/features/invitation/agenda";
import type { InviteLang, TemplateId } from "@/features/invitation/shared";
import { resolveMapEmbed } from "@/features/invitation/map-embed";
import { blobMusicEnabled, ensureInvitation, musicBlobPrefix, photoUrls } from "@/features/invitation/media";
import { TemplateEditor } from "@/features/invitation/editor/TemplateEditor";
import { pick, TEMPLATE_EDITOR_KEYS } from "@/lib/ui-keys";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);
  const { t } = await getDict();
  const [inv, photos, gallery, mapEmbedUrl] = await Promise.all([
    ensureInvitation(id),
    prisma.eventPhoto.findMany({ where: { eventId: id }, select: { kind: true, updatedAt: true } }),
    prisma.galleryPhoto.findMany({ where: { eventId: id }, select: { id: true }, orderBy: { sort: "asc" } }),
    resolveMapEmbed(event.mapUrl),
  ]);
  const urls = photoUrls(`/api/events/${id}`, photos);
  const [date, time] = toLocalInputValue(event.startsAt).split("T");
  const days = parseAgenda(event.agenda);

  return (
    <TemplateEditor
      action={saveInvitation.bind(null, id)}
      t={pick(t, TEMPLATE_EDITOR_KEYS)}
      shareId={inv.shareId}
      gallery={gallery.map((g) => ({ id: g.id, url: `/api/events/${id}/gallery/${g.id}` }))}
      addGalleryPhoto={addGalleryPhoto.bind(null, id)}
      deleteGalleryPhoto={deleteGalleryPhoto.bind(null, id)}
      musicUpload={blobMusicEnabled() ? { url: `/api/events/${id}/music/upload`, prefix: musicBlobPrefix(id) } : null}
      media={{
        coverUrl: coverUrl(event),
        musicUrl: inv.musicFile ? `/api/events/${id}/music?v=${encodeURIComponent(inv.musicFile)}` : null,
        musicName: inv.musicName,
        GROOM: urls.groomPhotoUrl,
        BRIDE: urls.bridePhotoUrl,
        VENUE: urls.venuePhotoUrl,
        BACKGROUND: urls.backgroundUrl,
        KHQR_USD: urls.khqrUsdUrl,
        KHQR_KHR: urls.khqrKhrUrl,
      }}
      initial={{
        template: inv.template as TemplateId,
        lang: inv.lang as InviteLang,
        published: inv.published,
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
        showGiftQr: inv.showGiftQr,
        giftUsdBank: inv.giftUsdBank,
        giftUsdName: inv.giftUsdName,
        giftUsdAccount: inv.giftUsdAccount,
        giftKhrBank: inv.giftKhrBank,
        giftKhrName: inv.giftKhrName,
        giftKhrAccount: inv.giftKhrAccount,
        themeColor: inv.themeColor,
        background: inv.background,
        fontStyle: inv.fontStyle,
        contactPhones: inv.contactPhones,
        lunarDate: inv.lunarDate,
        groomName: event.groomName,
        brideName: event.brideName,
        groomNameEn: event.groomNameEn,
        brideNameEn: event.brideNameEn,
        groomParents: event.groomParents,
        groomParentsEn: event.groomParentsEn,
        brideParents: event.brideParents,
        brideParentsEn: event.brideParentsEn,
        date,
        time,
        venue: event.venue,
        venueEn: event.venueEn,
        address: event.address,
        mapUrl: event.mapUrl,
        mapEmbedUrl,
        days: days.length ? days : [{ title: "", date: "", items: [{ time: "", text: "" }] }],
      }}
    />
  );
}
