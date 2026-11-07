import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { buildCsv, buildXlsx } from "@/features/guests/io";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  // only the names for the file name — not the whole row with the cover image bytes [review M-8]
  const event = await prisma.event.findFirst({ where: { id, ownerId: user.id }, select: { groomName: true, brideName: true } });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const { t } = await getDict();
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const template = req.nextUrl.searchParams.has("template");
  const guests = template
    ? []
    : await prisma.guest.findMany({ where: { eventId: id }, orderBy: { createdAt: "asc" } });

  const base = template ? "guest-template" : `guests-${event.groomName}-${event.brideName}`;
  const filename = `${base}.${format}`;
  const disposition = `attachment; filename="${base.replace(/[^\w-]/g, "_")}.${format}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

  if (format === "csv") {
    return new NextResponse(buildCsv(guests, t), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": disposition },
    });
  }
  return new NextResponse(new Uint8Array(await buildXlsx(guests, t)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": disposition,
    },
  });
}
