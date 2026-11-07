import "server-only";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { INVITE_TEXT, type InviteLang } from "@/features/invitation/shared";
import { resolveMapLinks } from "@/features/invitation/map-embed";
import { galleryUrls, photoUrls, toInvitationData } from "@/features/invitation/media";
import { InvitationView } from "@/features/invitation/templates/InvitationView";

/**
 * Invitation by share id (and optional guest), or null. Cached per request.
 * Guests only see published invitations; the event's owner can also open an unpublished one
 * as a draft (media then comes from the owner-only routes, and the RSVP form stays inactive).
 */
export const loadInvitation = cache(async (shareId: string, guestId?: string) => {
  const inv = await prisma.invitation.findFirst({
    where: { shareId },
    include: {
      event: {
        omit: { coverImage: true },
        include: {
          photos: { select: { kind: true, updatedAt: true } },
          gallery: { select: { id: true }, orderBy: { sort: "asc" } },
        },
      },
    },
  });
  if (!inv) return null;
  let draft = false;
  if (!inv.published) {
    const user = await getCurrentUser();
    if (user?.id !== inv.event.ownerId) return null;
    draft = true;
  }
  const guest = guestId
    ? await prisma.guest.findFirst({ where: { id: guestId, eventId: inv.eventId }, select: { name: true } })
    : null;
  if (guestId && !guest) return null;

  const base = draft ? `/api/events/${inv.eventId}` : `/api/invite/${shareId}`;
  const v = inv.updatedAt.getTime();
  const data = toInvitationData(
    inv.event,
    inv,
    {
      coverUrl: inv.event.coverImageType ? `${base}/cover?v=${inv.event.updatedAt.getTime()}` : null,
      musicUrl: inv.musicFile ? `${base}/music?v=${v}` : null,
      ...photoUrls(base, inv.event.photos),
      galleryUrls: galleryUrls(base, inv.event.gallery),
    },
    guest?.name ?? null,
    draft ? null : { shareId, guestId: guestId ?? null },
  );
  const map = await resolveMapLinks(inv.event.mapUrl);
  data.mapEmbedUrl = map.embed;
  if (map.href) data.mapUrl = map.href; // clean place link for the "open in Google Maps" button
  return { data, draft, eventId: inv.eventId };
});

export async function invitationMetadata(shareId: string, guestId?: string): Promise<Metadata> {
  const loaded = await loadInvitation(shareId, guestId);
  if (!loaded) return { robots: { index: false } };
  const { data } = loaded;
  const tx = INVITE_TEXT[data.lang as InviteLang];
  const title = `${data.groomName} ${tx.and} ${data.brideName} — ${data.title || tx.title}`;
  return {
    title,
    description: data.guestName ? `${tx.invite} ${data.guestName}` : tx.invite,
    robots: { index: false }, // private invitations: keep out of search engines
    openGraph: { title, images: data.coverUrl ? [data.coverUrl] : undefined },
  };
}

export async function InvitationPage({ shareId, guestId }: { shareId: string; guestId?: string }) {
  const loaded = await loadInvitation(shareId, guestId);
  if (!loaded) notFound();
  const { data, draft, eventId } = loaded;
  const { t } = draft ? await getDict() : { t: null };
  return (
    <main className="min-h-svh bg-stone-900">
      {draft && t && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-sm text-amber-950">
          <span>{t.draftBanner}</span>
          <Link href={`/events/${eventId}/template`} className="font-semibold underline">
            {t.openTemplate}
          </Link>
        </div>
      )}
      {/* overflow-x-clip (not hidden) so the sticky music button keeps working */}
      <div className="mx-auto max-w-[490px] overflow-x-clip shadow-2xl">
        <InvitationView data={data} autoPlayOnTap />
      </div>
    </main>
  );
}
