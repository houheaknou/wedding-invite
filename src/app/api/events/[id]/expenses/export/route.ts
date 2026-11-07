import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { buildExpenseCsv, buildExpenseXlsx, type ExportExpense } from "@/features/expenses/io";

/** Budget sheet download: ?format=xlsx (grouped tables like the couple's plan) | csv, &template=1 for an empty one */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const event = await prisma.event.findFirst({ where: { id, ownerId: user.id }, omit: { coverImage: true } });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const { t } = await getDict();
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const template = req.nextUrl.searchParams.has("template");
  const rows = template
    ? []
    : await prisma.expense.findMany({ where: { eventId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const expenses: ExportExpense[] = rows.map((e) => ({
    title: e.title,
    group: e.group,
    quantity: Number(e.quantity),
    unitPrice: e.unitPrice === null ? null : Number(e.unitPrice),
    amount: Number(e.amount),
    paid: Number(e.paid),
    category: e.category,
    vendor: e.vendor,
    dueDate: e.dueDate,
    notes: e.notes,
  }));

  const couple = `${event.groomName} & ${event.brideName}`;
  const base = template ? "budget-template" : `budget-${event.groomName}-${event.brideName}`;
  const disposition = `attachment; filename="${base.replace(/[^\w-]/g, "_")}.${format}"; filename*=UTF-8''${encodeURIComponent(`${base}.${format}`)}`;

  if (format === "csv") {
    return new NextResponse(buildExpenseCsv(expenses, t), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": disposition },
    });
  }
  const xlsx = await buildExpenseXlsx(expenses, t, {
    title: `${t.budgetSheetTitle} — ${couple}`,
    currency: event.currency,
    budget: template || event.budget === null ? null : Number(event.budget),
  });
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": disposition,
    },
  });
}
