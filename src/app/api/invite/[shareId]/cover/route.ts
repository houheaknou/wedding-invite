import { prisma } from "@/lib/db";

/** Public cover photo for a published invitation (also used as the link-preview image). */
export async function GET(_: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const inv = await prisma.invitation.findFirst({
    where: { shareId, published: true },
    select: { event: { select: { coverImage: true, coverImageType: true } } },
  });
  const ev = inv?.event;
  if (!ev?.coverImage || !ev.coverImageType) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(ev.coverImage), {
    headers: { "Content-Type": ev.coverImageType, "Cache-Control": "public, max-age=300" },
  });
}
