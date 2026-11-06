import { prisma } from "@/lib/db";
import { parseKind, photoResponse } from "@/lib/photos";

/** Public event photo for a published invitation. */
export async function GET(_: Request, { params }: { params: Promise<{ shareId: string; kind: string }> }) {
  const { shareId, kind } = await params;
  const k = parseKind(kind);
  const inv = k && (await prisma.invitation.findFirst({ where: { shareId, published: true }, select: { eventId: true } }));
  if (!k || !inv) return new Response("Not found", { status: 404 });
  return photoResponse(inv.eventId, k, "public, max-age=300");
}
