import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { blobMusicEnabled, MUSIC_MAX_BYTES, musicBlobPrefix } from "@/features/invitation/media";

/**
 * Hands the template editor a short-lived token to upload one song straight to Vercel Blob
 * (Vercel caps request bodies at 4.5 MB, songs may be 10 MB). Only the event's owner gets a token,
 * only for audio, only under this event's folder. The editor then saves the blob URL through the
 * normal save action, which re-checks the song's bytes (checkBlobSong) before storing it.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!blobMusicEnabled()) return Response.json({ error: "Blob storage is not configured" }, { status: 404 });
  const { id } = await params;
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        const owned = user && (await prisma.event.count({ where: { id, ownerId: user.id } }));
        if (!owned) throw new Error("Not allowed");
        if (!pathname.startsWith(musicBlobPrefix(id))) throw new Error("Bad path");
        return {
          allowedContentTypes: ["audio/*", "application/octet-stream"],
          maximumSizeInBytes: MUSIC_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      // Nothing to do here: the song is attached when the owner saves the invitation
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload refused" }, { status: 400 });
  }
}
