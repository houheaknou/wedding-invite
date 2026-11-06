import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, ownerId: user.id },
    select: { coverImage: true, coverImageType: true },
  });
  if (!event?.coverImage || !event.coverImageType) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(event.coverImage), {
    headers: {
      "Content-Type": event.coverImageType,
      // URLs carry ?v=<updatedAt>, so a changed cover gets a new URL
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
