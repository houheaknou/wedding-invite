"use server";

import { revalidatePath } from "next/cache";
import type { GuestStatus, RsvpAnswer } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/features/auth/session";
import { clientIp, hit } from "@/lib/rate-limit";
import { str } from "@/lib/parse";

// [review S-2, M-4] replies per IP per invitation, and guests an anonymous RSVP may add to one event
const RSVP_PER_IP = { max: 20, windowSec: 60 * 60 };
const RSVP_GUESTS_PER_EVENT = 500;

export type RsvpState = { ok?: boolean; error?: "name" | "phone" | "closed" | "limit" } | undefined;

const ANSWERS: RsvpAnswer[] = ["YES", "NO", "MAYBE"];
const STATUS_FOR: Record<RsvpAnswer, GuestStatus> = { YES: "CONFIRMED", NO: "DECLINED", MAYBE: "INVITED" };

/**
 * Public RSVP from a published invitation. The reply is stored and folded into the guest list:
 * the personal-link guest (or a guest with the same phone) is updated, otherwise a guest is added.
 */
export async function submitRsvp(shareId: string, guestId: string | null, _: RsvpState, fd: FormData): Promise<RsvpState> {
  // Honeypot: bots fill every field; pretend success
  if (str(fd, "website", 200)) return { ok: true };

  const inv = await prisma.invitation.findFirst({ where: { shareId, published: true, showRsvp: true }, select: { eventId: true } });
  if (!inv) return { error: "closed" };
  const eventId = inv.eventId;
  if (!(await hit(`rsvp:${await clientIp()}:${shareId}`, RSVP_PER_IP.max, RSVP_PER_IP.windowSec)).ok) return { error: "limit" };

  // Name and phone are checked only when the template's form asks for them: some templates (Falling
  // petals) send just the answer, head count and wish — the personal-link guest's name is used then.
  const linkGuest = guestId ? await prisma.guest.findFirst({ where: { id: guestId, eventId }, select: { id: true, name: true } }) : null;
  const typedName = str(fd, "name", 120);
  if (fd.has("name") && !typedName) return { error: "name" };
  const name = typedName || linkGuest?.name || "ភ្ញៀវកិត្តិយស";
  const phoneRaw = str(fd, "phone", 40);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (fd.has("phone") && (phone ?? "").replace("+", "").length < 6) return { error: "phone" };
  const answer = ANSWERS.includes(fd.get("answer") as RsvpAnswer) ? (fd.get("answer") as RsvpAnswer) : "YES";
  const count = Math.min(Math.max(Number.parseInt(String(fd.get("count") ?? "1"), 10) || 1, 1), 20);
  const message = str(fd, "message", 1000) || null;

  const guest = linkGuest || (phone ? await prisma.guest.findFirst({ where: { eventId, phone }, select: { id: true } }) : null);

  // a reply from the general link adds a guest: cap how many, so a script can't flood the list
  if (!guest && (await prisma.guest.count({ where: { eventId, group: "RSVP" } })) >= RSVP_GUESTS_PER_EVENT) return { error: "limit" };

  const status = STATUS_FOR[answer];
  const linked = guest
    ? await prisma.guest.update({
        where: { id: guest.id },
        data: { status, ...(answer !== "NO" && { invitedCount: count }) },
        select: { id: true },
      })
    : await prisma.guest.create({
        data: { eventId, name, phone, status, invitedCount: count, group: "RSVP", notes: message },
        select: { id: true },
      });

  await prisma.rsvp.create({ data: { eventId, guestId: linked.id, name, phone, answer, count, message } });
  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true };
}
