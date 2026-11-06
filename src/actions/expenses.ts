"use server";

import { revalidatePath } from "next/cache";
import type { ExpenseCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/lib/auth";
import { fmt, getDict } from "@/lib/i18n";
import { CURRENCIES, EXPENSE_CATEGORIES, formatMoney } from "@/lib/expenses";
import { parseExpenseFile } from "@/lib/expense-io";
import { isSupportedFile } from "@/lib/guest-io";
import type { FormState } from "@/actions/auth";
import type { ImportState } from "@/actions/guests";
import { money, opt } from "@/lib/parse";

/** Total = quantity × unit price, like the budget sheet */
function readExpense(fd: FormData) {
  const title = opt(fd, "title", 120);
  const unitPrice = money(fd, "unitPrice");
  const quantity = money(fd, "quantity") ?? 1;
  if (!title || unitPrice === null) return null;
  const amount = Math.round(quantity * unitPrice * 100) / 100;
  const category = String(fd.get("category")) as ExpenseCategory;
  const due = String(fd.get("dueDate") ?? "");
  return {
    title,
    group: opt(fd, "group", 60),
    quantity,
    unitPrice,
    amount,
    paid: Math.min(money(fd, "paid") ?? 0, amount), // can't have paid more than the cost
    category: EXPENSE_CATEGORIES.includes(category) ? category : "OTHER",
    vendor: opt(fd, "vendor", 120),
    notes: opt(fd, "notes", 1000),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T00:00:00Z`) : null,
  };
}

/** Expense ids come from the client, so always scope them to an owned event. */
async function ownedExpense(eventId: string, expenseId: string) {
  await requireOwnedEvent(eventId);
  return prisma.expense.findFirst({ where: { id: expenseId, eventId }, select: { id: true, amount: true } });
}

const refresh = (eventId: string) => revalidatePath(`/events/${eventId}`, "layout");

export async function addExpense(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const data = readExpense(fd);
  if (!data) return { error: t.errExpense };
  const last = await prisma.expense.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  await prisma.expense.create({ data: { ...data, eventId, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  refresh(eventId);
  return {};
}

/** Budget sheet (.xlsx/.csv) → expenses, appended in sheet order or replacing the current list */
export async function importExpenses(eventId: string, _: ImportState, fd: FormData): Promise<ImportState> {
  await requireOwnedEvent(eventId);
  const { t } = await getDict();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0 || !isSupportedFile(file)) return { error: t.errBadFile };
  let result;
  try {
    result = await parseExpenseFile(file);
  } catch {
    return { error: t.errBadFile };
  }
  if (!result.ok) return { error: t.errNoExpenseColumns };
  const replace = fd.get("replace") === "on";
  const start = replace ? 0 : ((await prisma.expense.aggregate({ where: { eventId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0);
  await prisma.$transaction([
    ...(replace ? [prisma.expense.deleteMany({ where: { eventId } })] : []),
    prisma.expense.createMany({ data: result.expenses.map((e, i) => ({ ...e, eventId, sortOrder: start + i + 1 })) }),
  ]);
  refresh(eventId);
  const total = result.expenses.reduce((s, e) => s + e.amount, 0);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { currency: true } });
  return {
    message: fmt(t.expenseImportDone, {
      n: result.expenses.length,
      groups: new Set(result.expenses.map((e) => e.group ?? "")).size,
      total: formatMoney(total, event?.currency ?? "USD"),
    }),
  };
}

export async function updateExpense(eventId: string, expenseId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getDict();
  if (!(await ownedExpense(eventId, expenseId))) return { error: t.errRequired };
  const data = readExpense(fd);
  if (!data) return { error: t.errExpense };
  await prisma.expense.update({ where: { id: expenseId }, data });
  refresh(eventId);
  return {};
}

/** The checkbox on each row: not fully paid → paid in full; paid in full → back to unpaid */
export async function toggleExpensePaid(eventId: string, expenseId: string) {
  await requireOwnedEvent(eventId);
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, eventId }, select: { amount: true, paid: true } });
  if (!expense) return;
  const fullyPaid = expense.paid.greaterThanOrEqualTo(expense.amount) && expense.amount.greaterThan(0);
  await prisma.expense.update({ where: { id: expenseId }, data: { paid: fullyPaid ? 0 : expense.amount } });
  refresh(eventId);
}

export async function deleteExpense(eventId: string, expenseId: string) {
  if (!(await ownedExpense(eventId, expenseId))) return;
  await prisma.expense.delete({ where: { id: expenseId } });
  refresh(eventId);
}

/** Budget (blank clears it) and the currency every amount of this event is in */
export async function updateBudget(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireOwnedEvent(eventId);
  const currency = String(fd.get("currency"));
  await prisma.event.update({
    where: { id: eventId },
    data: { budget: money(fd, "budget"), ...(CURRENCIES.includes(currency as never) && { currency }) },
  });
  refresh(eventId);
  return {};
}

/** Dashboard finance: riel per dollar, used to put $ and ៛ gifts next to the expenses */
export async function updateExchangeRate(eventId: string, fd: FormData) {
  await requireOwnedEvent(eventId);
  const rate = Math.round(Number(String(fd.get("rate") ?? "").replace(/[,\s៛]/g, "")));
  if (!Number.isFinite(rate) || rate < 100 || rate > 100000) return;
  await prisma.event.update({ where: { id: eventId }, data: { exchangeRate: rate } });
  refresh(eventId);
}
