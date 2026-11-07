import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmt, type Dict } from "@/lib/i18n";
import { formatMoney } from "@/features/expenses/shared";
import { updateExchangeRate } from "@/features/expenses/actions";
import { card } from "@/components/ui";

/**
 * Dashboard money overview: ចំណូល (gifts received) vs ចំណាយ (wedding expenses) → ចំណេញ or ខាត.
 * Everything is shown in the expenses' currency; gifts in the other currency are converted with the
 * event's exchange rate (1$ = N ៛), which can be changed here.
 */
export async function FinanceSummary({
  eventId,
  currency,
  rate,
  t,
}: {
  eventId: string;
  currency: string;
  rate: number;
  t: Dict;
}) {
  const [giftSums, giftCount, expenseSums] = await Promise.all([
    prisma.gift.groupBy({ by: ["currency"], where: { eventId }, _sum: { amount: true } }),
    prisma.gift.count({ where: { eventId } }),
    prisma.expense.aggregate({ where: { eventId }, _sum: { amount: true, paid: true } }),
  ]);
  const giftIn = (c: string) => Number(giftSums.find((g) => (c === "KHR" ? g.currency === "KHR" : g.currency !== "KHR"))?._sum.amount ?? 0);
  const usd = giftIn("USD");
  const khr = giftIn("KHR");
  // convert into the expenses' currency
  const income = currency === "KHR" ? khr + usd * rate : usd + khr / rate;
  const expense = Number(expenseSums._sum.amount ?? 0);
  const paid = Number(expenseSums._sum.paid ?? 0);
  const net = income - expense;
  const cash = income - paid; // what's left in hand after the bills already paid
  const money = (n: number) => formatMoney(n, currency);
  const top = Math.max(income, expense, 1);
  const profit = net >= 0;

  return (
    <section className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Scale className="size-4 text-brand-500" />
          {t.finance}
        </h2>
        {/* exchange rate: 1$ = N ៛ */}
        <form action={updateExchangeRate.bind(null, eventId)} className="flex items-center gap-1.5 text-xs text-stone-500">
          <span>{t.exchangeRate}</span>
          <span className="font-semibold text-stone-700">1$ =</span>
          <input
            name="rate"
            defaultValue={rate.toLocaleString("en-US")}
            inputMode="numeric"
            aria-label={t.exchangeRate}
            className="w-20 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-right text-xs font-semibold text-stone-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <span className="font-semibold text-stone-700">៛</span>
          <button type="submit" className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700 transition hover:bg-brand-100">
            {t.save}
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/events/${eventId}/gifts`} className="group rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 transition hover:border-emerald-300">
          <p className="flex items-center justify-between text-sm font-medium text-emerald-800">
            {t.income}
            <ArrowDownCircle className="size-5 opacity-70" />
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{money(income)}</p>
          <p className="text-xs text-emerald-800/80">
            {fmt(t.incomeDetail, { usd: formatMoney(usd, "USD"), khr: formatMoney(khr, "KHR"), n: giftCount })}
          </p>
        </Link>
        <Link href={`/events/${eventId}/expenses`} className="group rounded-2xl border border-rose-100 bg-rose-50/70 p-4 transition hover:border-rose-300">
          <p className="flex items-center justify-between text-sm font-medium text-rose-800">
            {t.tabExpenses}
            <ArrowUpCircle className="size-5 opacity-70" />
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{money(expense)}</p>
          <p className="text-xs text-rose-800/80">{fmt(t.expenseDetail, { paid: money(paid), left: money(expense - paid) })}</p>
        </Link>
        <div className={`rounded-2xl border p-4 ${profit ? "border-sky-100 bg-sky-50/70" : "border-red-200 bg-red-50"}`}>
          <p className={`flex items-center justify-between text-sm font-medium ${profit ? "text-sky-800" : "text-red-800"}`}>
            {profit ? t.profit : t.loss}
            {profit ? <TrendingUp className="size-5 opacity-70" /> : <TrendingDown className="size-5 opacity-70" />}
          </p>
          <p className={`mt-1 text-2xl font-bold ${profit ? "text-sky-700" : "text-red-600"}`}>
            {profit ? "+" : "−"}
            {money(Math.abs(net))}
          </p>
          <p className={`text-xs ${profit ? "text-sky-800/80" : "text-red-800/80"}`}>{fmt(t.cashInHand, { amount: money(cash) })}</p>
        </div>
      </div>

      {/* income vs expenses, side by side */}
      <div className="space-y-2 text-xs">
        {[
          { label: t.income, value: income, bar: "bg-emerald-400" },
          { label: t.tabExpenses, value: expense, bar: "bg-rose-400" },
        ].map(({ label, value, bar }) => (
          <div key={label} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2">
            <span className="text-stone-500">{label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.round((value / top) * 100)}%` }} />
            </span>
            <span className="font-semibold text-stone-700">{money(value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
