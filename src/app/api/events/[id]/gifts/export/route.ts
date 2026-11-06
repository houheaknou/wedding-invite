import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { buildGiftCsv, buildGiftXlsx } from "@/lib/gift-io";

/** Gift book download: ?format=xlsx | csv, &template=1 for an empty one */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const event = await prisma.event.findFirst({ where: { id, ownerId: user.id }, select: { groomName: true, brideName: true } });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const { t } = await getDict();
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const template = req.nextUrl.searchParams.has("template");
  const rows = template ? [] : await prisma.gift.findMany({ where: { eventId: id }, orderBy: { createdAt: "asc" } });
  const gifts = rows.map((g) => ({ ...g, amount: Number(g.amount) }));

  const base = template ? "gifts-template" : `gifts-${event.groomName}-${event.brideName}`;
  const disposition = `attachment; filename="${base.replace(/[^\w-]/g, "_")}.${format}"; filename*=UTF-8''${encodeURIComponent(`${base}.${format}`)}`;
  if (format === "csv") {
    return new NextResponse(buildGiftCsv(gifts, t), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": disposition } });
  }
  const xlsx = await buildGiftXlsx(gifts, t, `${t.giftBookTitle} — ${event.groomName} & ${event.brideName}`);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": disposition },
  });
}
