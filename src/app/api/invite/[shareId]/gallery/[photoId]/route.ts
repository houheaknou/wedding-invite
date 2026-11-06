import { prisma } from "@/lib/db";

/** Public gallery photo for a published invitation. */
export async function GET(_: Request, { params }: { params: Promise<{ shareId: string; photoId: string }> }) {
  const { shareId, photoId } = await params;
  const photo = await prisma.galleryPhoto.findFirst({
    where: { id: photoId, event: { invitation: { shareId, published: true } } },
    select: { data: true, type: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
