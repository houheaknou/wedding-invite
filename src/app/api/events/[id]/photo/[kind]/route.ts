import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { parseKind, photoResponse } from "@/features/invitation/photos";

/** Owner-only event photo (couple portraits, venue), used by the builder preview. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id, kind } = await params;
  const k = parseKind(kind);
  const owned = k && (await prisma.event.findFirst({ where: { id, ownerId: user.id }, select: { id: true } }));
  if (!k || !owned) return new Response("Not found", { status: 404 });
  return photoResponse(id, k, "private, max-age=31536000, immutable");
}
