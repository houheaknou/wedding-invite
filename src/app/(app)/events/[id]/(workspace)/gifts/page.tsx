import Link from "next/link";
import type { GuestSide } from "@prisma/client";
import { Banknote, Download, Gift, Search, Trash2, Upload, UserCheck, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { SIDE_CHIP } from "@/lib/constants";
import { formatMoney } from "@/features/expenses/shared";
import { GIFT_SIDES, giftTotals, METHOD_ICON, type GiftRow } from "@/features/gifts/shared";
import { addGift, deleteGift, importGifts, updateGift } from "@/features/gifts/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Dropdown } from "@/components/Dropdown";
import { GiftForm } from "@/features/gifts/GiftForms";
import { ImportForm } from "@/components/ImportForm";
import { Modal } from "@/components/Modal";
import { btnSecondary, card, chip, inputCls } from "@/components/ui";
import { pick, GIFT_FORMS_KEYS, IMPORT_FORM_KEYS } from "@/lib/ui-keys";

/** "$1,250 + 500,000 ៛" — the two currencies are never added together */
const both = (usd: number, khr: number) => [usd || !khr ? formatMoney(usd, "USD") : "", khr ? formatMoney(khr, "KHR") : ""].filter(Boolean).join(" + ");

export default async function GiftsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ side?: string; q?: string }> }) {
  const { id } = await params;
  await requireOwnedEvent(id);
  const { t, lang } = await getDict();
  const sp = await searchParams;
  const side = GIFT_SIDES.includes(sp.side as GuestSide) ? (sp.side as GuestSide) : undefined;
  const q = sp.q?.trim() ?? "";

  const [rows, guests] = await Promise.all([
    prisma.gift.findMany({ where: { eventId: id }, orderBy: { createdAt: "asc" } }),
    prisma.guest.findMany({ where: { eventId: id }, select: { id: true, name: true, side: true, group: true, phone: true }, orderBy: { name: "asc" } }),
  ]);
  const gifts: GiftRow[] = rows.map((g, i) => ({
    id: g.id,
    name: g.name,
    amount: Number(g.amount),
    currency: g.currency,
    side: g.side,
    method: g.method,
    notes: g.notes,
    guestId: g.guestId,
    createdAt: g.createdAt.toISOString(),
    no: i + 1,
  })) as (GiftRow & { no: number })[];

  const all = giftTotals(gifts);
  const bySide = (s: GuestSide) => giftTotals(gifts.filter((g) => g.side === s));
  const shown = (gifts as (GiftRow & { no: number })[])
    .filter((g) => (!side || g.side === side) && (!q || g.name.toLowerCase().includes(q.toLowerCase()) || g.notes?.toLowerCase().includes(q.toLowerCase())))
    .reverse(); // newest first: easy to check the envelope just entered
  const shownTotals = giftTotals(shown);
  const exportBase = `/api/events/${id}/gifts/export`;
  const given = [...new Set(gifts.map((g) => g.guestId).filter((x): x is string => Boolean(x)))];
  const timeFmt = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" });
  const href = (next: { side?: string; q?: string }) => {
    const p = new URLSearchParams();
    if (next.side) p.set("side", next.side);
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `?${s}` : "?";
  };
  const tabs = [
    { key: "", label: t.all, n: gifts.length },
    ...GIFT_SIDES.filter((s) => s !== "BOTH" || gifts.some((g) => g.side === "BOTH")).map((s) => ({ key: s, label: t[`side_${s}`], n: gifts.filter((g) => g.side === s).length })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.giftManagement}</h1>
        <div className="flex items-center gap-2">
          <Modal
            title={t.importGifts}
            closeLabel={t.close}
            triggerClassName={`${btnSecondary} px-4`}
            trigger={
              <>
                <Upload className="size-4" />
                {t.import}
              </>
            }
          >
            <ImportForm action={importGifts.bind(null, id)} t={pick(t, IMPORT_FORM_KEYS)} help={t.importGiftsHelp} templateHref={`${exportBase}?format=xlsx&template=1`}>
              <label className="flex items-start gap-2 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input type="checkbox" name="replace" className="mt-1 size-4 accent-brand-600" />
                <span>{t.importReplaceGifts}</span>
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
            ].map(([h, label]) => (
              <a key={h} href={h} className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-brand-50 hover:text-brand-700">
                {label}
              </a>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* Totals: dollars and riel kept apart */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className={`${card} col-span-2 bg-gradient-to-br sm:col-span-1 from-brand-50 via-white to-rose-50/60`}>
          <p className="flex items-center gap-1.5 text-sm text-stone-500">
            <Banknote className="size-4 text-brand-500" />
            {t.giftTotal}
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-700">{formatMoney(all.usd, "USD")}</p>
          <p className="text-lg font-bold text-brand-600">{formatMoney(all.khr, "KHR")}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <Gift className="size-3.5" />
            {fmt(t.giftCount, { n: gifts.length })}
          </p>
        </div>
        {(["BRIDE", "GROOM"] as const).map((s) => {
          const tot = bySide(s);
          return (
            <Link key={s} href={href({ side: s, q })} scroll={false} className={`${card} min-w-0 p-3 transition hover:border-brand-300 sm:p-4 ${side === s ? "ring-2 ring-brand-300" : ""}`}>
              <span className={`${chip} ${SIDE_CHIP[s]}`}>{t[`side_${s}`]}</span>
              <p className="mt-2 text-base font-bold text-stone-800">{formatMoney(tot.usd, "USD")}</p>
              <p className="text-sm font-semibold text-stone-600">{formatMoney(tot.khr, "KHR")}</p>
            </Link>
          );
        })}
      </section>

      {/* Quick add — stays open for the next envelope */}
      <section className={`${card} space-y-3`}>
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-base">🧧</span>
          {t.addGift}
        </h2>
        <GiftForm action={addGift.bind(null, id)} t={pick(t, GIFT_FORMS_KEYS)} guests={guests} given={given} />
      </section>

      {/* List */}
      <section className={`${card} space-y-3 p-3 sm:p-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <nav className="flex gap-1 overflow-x-auto rounded-full bg-stone-100 p-1 [scrollbar-width:none]">
            {tabs.map(({ key, label, n }) => (
              <Link
                key={key || "all"}
                href={href({ side: key, q })}
                scroll={false}
                className={`rounded-full px-3 py-1 text-sm whitespace-nowrap transition ${(side ?? "") === key ? "bg-white font-semibold text-brand-700 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
              >
                {label} <span className="text-xs opacity-70">{n}</span>
              </Link>
            ))}
          </nav>
          <form className="relative flex-1" action="">
            {side && <input type="hidden" name="side" value={side} />}
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={q} placeholder={t.giftSearch} className={`${inputCls} pl-10 pr-10`} />
            {q && (
              <Link href={href({ side })} scroll={false} aria-label={t.clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
                <X className="size-4" />
              </Link>
            )}
          </form>
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-stone-500">
            <span className="text-4xl">{q || side ? "🔍" : "🧧"}</span>
            {q || side ? t.noMatches : t.noGifts}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-stone-100">
              {shown.map((g) => (
                <li key={g.id}>
                  <Modal
                    title={t.editGift}
                    closeLabel={t.close}
                    triggerClassName="grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl px-1.5 py-2 text-left text-sm transition hover:bg-brand-50/60"
                    trigger={
                      <>
                        <span className="text-xs text-stone-400">{g.no}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-stone-800">{g.name}</span>
                            {g.guestId && <UserCheck className="size-3.5 shrink-0 text-emerald-500" aria-label={t.giftOnGuestList} />}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
                            {g.side !== "BOTH" && <span className={`${chip} px-1.5 py-0 text-[10px] ${SIDE_CHIP[g.side]}`}>{t[`side_${g.side}`]}</span>}
                            <span>
                              {METHOD_ICON[g.method]} {t[`method_${g.method}`]}
                            </span>
                            <span>{timeFmt.format(new Date(g.createdAt))}</span>
                            {g.notes && <span className="truncate">· {g.notes}</span>}
                          </span>
                        </span>
                        <span className={`text-right font-semibold ${g.currency === "KHR" ? "text-brand-700" : "text-stone-800"}`}>{formatMoney(g.amount, g.currency)}</span>
                      </>
                    }
                  >
                    <GiftForm action={updateGift.bind(null, id, g.id)} t={pick(t, GIFT_FORMS_KEYS)} gift={g} guests={guests} given={given} />
                    <div className="mt-4 flex justify-start border-t border-stone-100 pt-3">
                      <ConfirmButton
                        action={deleteGift.bind(null, id, g.id)}
                        confirm={t.confirmDelete}
                        className={`${btnSecondary} px-3 py-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50`}
                      >
                        <Trash2 className="size-3.5" />
                        {t.deleteGift}
                      </ConfirmButton>
                    </div>
                  </Modal>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-1.5 pt-3 text-sm">
              <span className="text-stone-500">{fmt(t.giftCount, { n: shown.length })}</span>
              <span className="font-bold text-stone-800">{both(shownTotals.usd, shownTotals.khr)}</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
