import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { serveMusic } from "@/features/invitation/media";

/** Owner-only music stream, used by the template editor preview. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const inv = await prisma.invitation.findFirst({
    where: { eventId: id, event: { ownerId: user.id } },
    select: { musicFile: true, musicType: true },
  });
  if (!inv?.musicFile || !inv.musicType) return new Response("Not found", { status: 404 });
  return serveMusic(inv.musicFile, inv.musicType, req);
}
