import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Owner-only gallery photo, used by the builder and draft previews. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id, photoId } = await params;
  const photo = await prisma.galleryPhoto.findFirst({
    where: { id: photoId, eventId: id, event: { ownerId: user.id } },
    select: { data: true, type: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
