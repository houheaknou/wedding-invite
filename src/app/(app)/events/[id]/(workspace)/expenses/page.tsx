import Link from "next/link";
import { CalendarClock, Check, CheckCheck, Download, Pencil, PiggyBank, Plus, Receipt, Trash2, Upload, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/lib/auth";
import { fmt, getDict } from "@/lib/i18n";
import { CATEGORY_STYLE, EXPENSE_CATEGORIES, formatMoney, payStatus } from "@/lib/expenses";
import { addExpense, deleteExpense, importExpenses, toggleExpensePaid, updateBudget, updateExpense } from "@/actions/expenses";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Dropdown } from "@/components/Dropdown";
import { BudgetForm, ExpenseForm, type ExpenseRow } from "@/components/ExpenseForms";
import { ImportForm } from "@/components/ImportForm";
import { Modal } from "@/components/Modal";
import { btnIcon, btnPrimary, btnSecondary, card } from "@/components/ui";
import { pick, EXPENSE_FORMS_KEYS, IMPORT_FORM_KEYS } from "@/lib/ui-keys";

/** Bar colours for group breakdown (groups have no fixed colour) */
const GROUP_BARS = ["bg-amber-400", "bg-rose-400", "bg-sky-400", "bg-emerald-400", "bg-violet-400", "bg-orange-400", "bg-teal-400", "bg-pink-400"];

const ALL = "__all";

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ g?: string }>;
}) {
  const { id } = await params;
  const { g: picked } = await searchParams;
  const { event } = await requireOwnedEvent(id);
  const { t, lang } = await getDict();
  const rows = await prisma.expense.findMany({ where: { eventId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  const currency = event.currency;
  const money = (n: number) => formatMoney(n, currency);
  const expenses: ExpenseRow[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    group: e.group,
    category: e.category,
    vendor: e.vendor,
    quantity: Number(e.quantity),
    unitPrice: e.unitPrice === null ? null : Number(e.unitPrice),
    amount: Number(e.amount),
    paid: Number(e.paid),
    dueDate: e.dueDate ? e.dueDate.toISOString().slice(0, 10) : null,
    notes: e.notes,
  }));

  const budget = event.budget === null ? null : Number(event.budget);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const paid = expenses.reduce((s, e) => s + e.paid, 0);
  const toPay = total - paid;
  const left = budget === null ? null : budget - total;
  const usedPct = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const paidPct = total ? Math.round((paid / total) * 100) : 0;

  // Sections in sheet order: "Group 1", "Group 2"… (expenses without a group last)
  const groupNames = [...new Set(expenses.map((e) => e.group).filter((g): g is string => Boolean(g)))];
  const hasGroups = groupNames.length > 0;
  const sections = hasGroups
    ? [
        ...groupNames.map((g) => ({ name: g, items: expenses.filter((e) => e.group === g) })),
        ...(expenses.some((e) => !e.group) ? [{ name: t.noGroup, items: expenses.filter((e) => !e.group) }] : []),
      ]
    : [{ name: "", items: expenses }];
  // One group at a time (tabs): ?g=Group 2, or ?g=__all for every group; the first group by default
  const showAll = !hasGroups || picked === ALL;
  const current = showAll ? null : (sections.find((s) => s.name === picked) ?? sections[0]);
  const shown = current ? [current] : sections;
  const groupHref = (name: string) => `?g=${encodeURIComponent(name)}`;

  // Breakdown: by the sheet's groups when there are any, otherwise by category
  const breakdown = hasGroups
    ? sections.map((s, i) => ({ key: s.name, label: s.name, sum: s.items.reduce((a, e) => a + e.amount, 0), bar: GROUP_BARS[i % GROUP_BARS.length] }))
    : EXPENSE_CATEGORIES.map((c) => ({
        key: c,
        label: `${CATEGORY_STYLE[c].emoji} ${t[`cat_${c}`]}`,
        sum: expenses.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0),
        bar: CATEGORY_STYLE[c].bar,
      }))
        .filter((x) => x.sum > 0)
        .sort((a, b) => b.sum - a.sum);

  const today = new Date().toISOString().slice(0, 10);
  const dateFmt = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const exportBase = `/api/events/${id}/expenses/export`;

  const stats = [
    { label: t.expenseTotal, value: money(total), icon: Receipt, tone: "text-brand-700 bg-brand-50" },
    { label: t.expensePaidTotal, value: money(paid), icon: CheckCheck, tone: "text-emerald-700 bg-emerald-50" },
    { label: t.expenseToPay, value: money(toPay), icon: Wallet, tone: "text-rose-700 bg-rose-50" },
  ];

  // Desktop: No · name · qty · unit price · total, like the budget sheet. Phone: qty × price under the name.
  const cols = "grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:grid-cols-[1.75rem_minmax(0,1fr)_3.5rem_6rem_6.5rem]";
  const line = (e: ExpenseRow, i: number) => {
    const status = payStatus(e.amount, e.paid);
    const done = status === "PAID" && e.amount > 0;
    const overdue = !done && e.amount > 0 && e.dueDate !== null && e.dueDate < today;
    const extras = [
      e.category !== "OTHER" && `${CATEGORY_STYLE[e.category].emoji} ${t[`cat_${e.category}`]}`,
      e.vendor,
      e.notes,
    ].filter(Boolean);
    return (
      <li key={e.id} className="flex items-center gap-1.5 rounded-xl pl-1 transition hover:bg-brand-50/60">
        {/* tap: paid in full ⇄ unpaid */}
        <form action={toggleExpensePaid.bind(null, id, e.id)} className="shrink-0">
          <button
            type="submit"
            disabled={e.amount <= 0}
            title={done ? t.markUnpaid : t.markPaid}
            aria-label={done ? t.markUnpaid : t.markPaid}
            className={`flex size-6 items-center justify-center rounded-full border-2 transition disabled:invisible ${
              done
                ? "border-emerald-500 bg-emerald-500 text-white"
                : status === "PARTIAL"
                  ? "border-amber-400 bg-amber-50 text-amber-500 hover:border-emerald-400"
                  : "border-stone-300 text-transparent hover:border-emerald-400 hover:text-emerald-400"
            }`}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </button>
        </form>
        {/* tap the row: edit */}
        <Modal
          title={t.editExpense}
          closeLabel={t.close}
          triggerClassName={`grid min-w-0 flex-1 ${cols} items-center gap-x-2 py-2 pr-2 text-left text-sm`}
          trigger={
            <>
              <span className="text-xs text-stone-400">{i + 1}</span>
              <span className="min-w-0">
                <span className={`block truncate font-medium ${done ? "text-stone-400 line-through decoration-stone-300" : "text-stone-800"}`}>{e.title}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                  {e.quantity !== 1 && e.unitPrice !== null && (
                    <span className="sm:hidden">
                      {e.quantity.toLocaleString("en-US")} × {money(e.unitPrice)}
                    </span>
                  )}
                  {status === "PARTIAL" && <span className="text-amber-700">{fmt(t.paidSoFar, { amount: money(e.paid) })}</span>}
                  {e.dueDate && !done && e.amount > 0 && (
                    <span className={`inline-flex items-center gap-0.5 ${overdue ? "font-medium text-rose-600" : ""}`}>
                      <CalendarClock className="size-3" />
                      {dateFmt.format(new Date(e.dueDate))}
                    </span>
                  )}
                  {extras.length > 0 && <span className="truncate">{extras.join(" · ")}</span>}
                </span>
              </span>
              <span className="hidden text-right text-stone-500 sm:block">{e.quantity.toLocaleString("en-US")}</span>
              <span className="hidden text-right text-stone-500 sm:block">{e.unitPrice === null ? "—" : money(e.unitPrice)}</span>
              <span className={`text-right font-semibold ${e.amount <= 0 ? "text-stone-300" : done ? "text-emerald-600" : "text-stone-800"}`}>
                {e.amount <= 0 ? "—" : money(e.amount)}
              </span>
            </>
          }
        >
          <ExpenseForm action={updateExpense.bind(null, id, e.id)} t={pick(t, EXPENSE_FORMS_KEYS)} expense={e} currency={currency} groups={groupNames} />
          <div className="mt-4 flex justify-start border-t border-stone-100 pt-3">
            <ConfirmButton action={deleteExpense.bind(null, id, e.id)} confirm={t.confirmDelete} className={`${btnSecondary} px-3 py-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50`}>
              <Trash2 className="size-3.5" />
              {t.deleteExpense}
            </ConfirmButton>
          </div>
        </Modal>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.expenseManagement}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Modal
            title={t.importBudget}
            closeLabel={t.close}
            triggerClassName={`${btnSecondary} px-4`}
            trigger={
              <>
                <Upload className="size-4" />
                {t.import}
              </>
            }
          >
            <ImportForm action={importExpenses.bind(null, id)} t={pick(t, IMPORT_FORM_KEYS)} help={t.importExpensesHelp} templateHref={`${exportBase}?format=xlsx&template=1`}>
              <label className="flex items-start gap-2 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input type="checkbox" name="replace" className="mt-1 size-4 accent-brand-600" />
                <span>{t.importReplace}</span>
              </label>
            </ImportForm>
          </Modal>
          <Dropdown
            summaryClassName={`${btnSecondary} px-4`}
            summary={
              <>
                <Download className="size-4" />
                {t.export}
              </>
            }
          >
            {[
              [`${exportBase}?format=xlsx`, t.exportXlsx],
              [`${exportBase}?format=csv`, t.exportCsv],
              [`${exportBase}?format=xlsx&template=1`, t.downloadTemplate],
            ].map(([href, label]) => (
              <a key={href} href={href} className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-brand-50 hover:text-brand-700">
                {label}
              </a>
            ))}
          </Dropdown>
          <Modal
            title={t.addExpense}
            closeLabel={t.close}
            triggerClassName={btnPrimary}
            trigger={
              <>
                <Plus className="size-4" />
                {t.addExpense}
              </>
            }
          >
            <ExpenseForm action={addExpense.bind(null, id)} t={pick(t, EXPENSE_FORMS_KEYS)} currency={currency} groups={groupNames} />
          </Modal>
        </div>
      </div>

      {/* Budget + totals */}
      <section className="grid gap-3 lg:grid-cols-[1.3fr_2fr]">
        <div className={`${card} relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-rose-50/60`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-stone-500">
                <PiggyBank className="size-4 text-brand-500" />
                {t.budget}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-700">{budget === null ? "—" : money(budget)}</p>
            </div>
            <Modal
              title={t.budget}
              closeLabel={t.close}
              triggerClassName={`${btnSecondary} px-3 py-1.5 text-xs`}
              trigger={
                <>
                  <Pencil className="size-3.5" />
                  {t.edit}
                </>
              }
            >
              <BudgetForm action={updateBudget.bind(null, id)} t={pick(t, EXPENSE_FORMS_KEYS)} budget={budget} currency={currency} />
            </Modal>
          </div>
          {budget === null ? (
            <p className="mt-3 text-xs text-stone-500">{t.budgetEmpty}</p>
          ) : (
            <div className="mt-4 space-y-1.5">
              <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-all ${left !== null && left < 0 ? "bg-rose-400" : "bg-gradient-to-r from-brand-300 to-brand-500"}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className={`text-xs ${left !== null && left < 0 ? "font-medium text-rose-600" : "text-stone-500"}`}>
                {left !== null && left < 0 ? fmt(t.budgetOver, { amount: money(-left) }) : fmt(t.budgetLeft, { amount: money(left ?? 0), pct: usedPct })}
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className={`${card} p-3 sm:p-4`}>
              <span className={`inline-flex size-8 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-4" />
              </span>
              <p className="mt-2 text-[11px] text-stone-500 sm:text-xs">{label}</p>
              <p className="truncate text-sm font-bold text-stone-800 sm:text-lg">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {expenses.length === 0 ? (
        <section className={`${card} flex flex-col items-center gap-2 py-12 text-center text-stone-500`}>
          <span className="text-4xl">🧾</span>
          <p>{t.noExpenses}</p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr] lg:items-start">
          {/* Breakdown */}
          <section className={`${card} order-last space-y-3 lg:sticky lg:top-20 lg:order-none`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{hasGroups ? t.byGroup : t.byCategory}</h2>
              <span className="text-xs text-stone-500">{fmt(t.paidPct, { pct: paidPct })}</span>
            </div>
            <ul className="space-y-2.5">
              {breakdown.map(({ key, label, sum, bar }) => {
                const body = (
                  <>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{label}</span>
                      <span className="shrink-0 font-medium text-stone-700">{money(sum)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${total ? Math.max(3, Math.round((sum / total) * 100)) : 0}%` }} />
                    </div>
                  </>
                );
                return (
                  <li key={key}>
                    {hasGroups ? (
                      <Link
                        href={groupHref(key)}
                        scroll={false}
                        className={`-mx-2 block space-y-1 rounded-xl px-2 py-1 transition hover:bg-brand-50 ${current?.name === key ? "bg-brand-50 ring-1 ring-brand-200" : ""}`}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="space-y-1">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Expense list: group tabs, then the picked group's table (like one sheet of the budget plan) */}
          <div className="min-w-0 space-y-3">
            {hasGroups && sections.length > 1 && (
              <nav className="sticky top-[61px] z-10 -mx-2 bg-[var(--color-blush)]/90 px-2 py-1.5 backdrop-blur sm:-mx-1 sm:px-1">
                <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {[...sections.map((s) => ({ key: s.name, label: s.name, items: s.items })), { key: ALL, label: t.allExpenses, items: expenses }].map(
                    ({ key, label, items }) => {
                      const active = key === ALL ? showAll : current?.name === key;
                      const sum = items.reduce((a, e) => a + e.amount, 0);
                      const allPaid = sum > 0 && items.every((e) => e.paid >= e.amount);
                      return (
                        <li key={key} className="shrink-0">
                          <Link
                            href={groupHref(key)}
                            scroll={false}
                            aria-current={active ? "page" : undefined}
                            className={`flex flex-col rounded-2xl border px-3.5 py-1.5 text-left transition ${
                              active
                                ? "border-brand-500 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-600/20"
                                : "border-brand-100 bg-white text-stone-700 hover:border-brand-300 hover:bg-brand-50"
                            }`}
                          >
                            <span className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap">
                              {allPaid && <Check className="size-3.5" strokeWidth={3} />}
                              {label}
                            </span>
                            <span className={`text-xs whitespace-nowrap ${active ? "text-white/85" : "text-stone-500"}`}>
                              {money(sum)} · {items.length}
                            </span>
                          </Link>
                        </li>
                      );
                    },
                  )}
                </ul>
              </nav>
            )}
            {shown.map((s) => {
              const sub = s.items.reduce((a, e) => a + e.amount, 0);
              const subPaid = s.items.reduce((a, e) => a + e.paid, 0);
              return (
                <section key={s.name || "all"} className={`${card} p-2 sm:p-3`}>
                  <div className="flex items-center gap-3 px-2 pb-2 pt-1">
                    <div className="min-w-0 flex-1">
                      <h2 className="flex items-center gap-2 font-semibold text-brand-700">
                        <span className="size-2 shrink-0 rounded-full bg-brand-400" />
                        <span className="truncate">{s.name || t.allExpenses}</span>
                        <span className="text-xs font-normal text-stone-400">· {s.items.length}</span>
                      </h2>
                      <p className="text-xs text-stone-500">{fmt(t.groupPaidOf, { paid: money(subPaid), total: money(sub) })}</p>
                    </div>
                    <span className="text-right text-base font-bold text-stone-800">{money(sub)}</span>
                    <Modal
                      title={t.addExpense}
                      closeLabel={t.close}
                      triggerClassName={`${btnIcon} shrink-0 border-brand-200 text-brand-600`}
                      trigger={<Plus className="size-4" aria-label={t.addExpense} />}
                    >
                      <ExpenseForm
                        action={addExpense.bind(null, id)}
                        t={pick(t, EXPENSE_FORMS_KEYS)}
                        currency={currency}
                        groups={groupNames}
                        defaultGroup={s.name && s.name !== t.noGroup ? s.name : undefined}
                      />
                    </Modal>
                  </div>
                  <div className={`hidden ${cols} gap-x-2 border-y border-stone-100 bg-stone-50/70 py-1.5 pl-9 pr-2 text-[11px] font-medium text-stone-500 sm:grid`}>
                    <span>No</span>
                    <span>{t.expenseTitle}</span>
                    <span className="text-right">{t.expenseQuantity}</span>
                    <span className="text-right">{t.expenseUnitPrice}</span>
                    <span className="text-right">{t.expenseAmount}</span>
                  </div>
                  <ul className="divide-y divide-stone-100">{s.items.map(line)}</ul>
                </section>
              );
            })}
            <p className="px-2 text-center text-xs text-stone-400">{t.expenseListHint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
