import { prisma } from "@/lib/db";
import { serveMusic } from "@/lib/media";

/** Public music stream for a published invitation. */
export async function GET(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const inv = await prisma.invitation.findFirst({
    where: { shareId, published: true },
    select: { musicFile: true, musicType: true },
  });
  if (!inv?.musicFile || !inv.musicType) return new Response("Not found", { status: 404 });
  return serveMusic(inv.musicFile, inv.musicType, req);
}
