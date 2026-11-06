import "server-only";
import { prisma } from "@/lib/db";
import { coverUrl } from "@/lib/format";
import type { InvitationData } from "@/lib/invitation";
import { resolveMapLinks } from "@/lib/map-embed";
import { ensureInvitation, galleryUrls, photoUrls, toInvitationData } from "@/lib/media";

/** The event's invitation as its owner sees it (owner-only media routes, inactive RSVP). */
export async function ownerInvitationData(eventId: string): Promise<InvitationData> {
  const [inv, event] = await Promise.all([
    ensureInvitation(eventId),
    prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      omit: { coverImage: true },
      include: {
        photos: { select: { kind: true, updatedAt: true } },
        gallery: { select: { id: true }, orderBy: { sort: "asc" } },
      },
    }),
  ]);
  const base = `/api/events/${eventId}`;
  const data = toInvitationData(event, inv, {
    coverUrl: coverUrl(event),
    musicUrl: null, // previews stay silent
    ...photoUrls(base, event.photos),
    galleryUrls: galleryUrls(base, event.gallery),
  });
  const map = await resolveMapLinks(event.mapUrl);
  data.mapEmbedUrl = map.embed;
  if (map.href) data.mapUrl = map.href; // clean place link for the "open in Google Maps" button
  return data;
}
