import Link from "next/link";
import type { GuestStatus } from "@prisma/client";
import type { RsvpAnswer } from "@prisma/client";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircleHeart,
  Pencil,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { parseAgenda } from "@/lib/agenda";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/lib/auth";
import { fmt, getDict } from "@/lib/i18n";
import { coverUrl, daysUntil, formatDateTime } from "@/lib/format";
import { SIDES, STATUS_COLOR, STATUSES } from "@/lib/constants";
import { deleteEvent } from "@/actions/events";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Donut } from "@/components/Donut";
import { FinanceSummary } from "@/components/FinanceSummary";
import { btnDanger, btnPrimary, card, chip, coverFit } from "@/components/ui";

const RSVP_CHIP: Record<RsvpAnswer, string> = {
  YES: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  NO: "bg-red-50 text-red-700 ring-1 ring-red-200",
  MAYBE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);
  const { t, lang } = await getDict();

  const [byStatus, bySide, rsvps] = await Promise.all([
    prisma.guest.groupBy({ by: ["status"], where: { eventId: id }, _count: true, _sum: { invitedCount: true } }),
    prisma.guest.groupBy({ by: ["side"], where: { eventId: id }, _count: true, _sum: { invitedCount: true } }),
    prisma.rsvp.findMany({ where: { eventId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const programme = parseAgenda(event.agenda);
  const status = Object.fromEntries(
    STATUSES.map((s) => {
      const row = byStatus.find((r) => r.status === s);
      return [s, { guests: row?._count ?? 0, people: row?._sum.invitedCount ?? 0 }];
    }),
  ) as Record<GuestStatus, { guests: number; people: number }>;
  const totalGuests = STATUSES.reduce((n, s) => n + status[s].guests, 0);
  const totalPeople = STATUSES.reduce((n, s) => n + status[s].people, 0);

  const cover = coverUrl(event);
  const days = daysUntil(event.startsAt);

  const stats = [
    { label: t.statGuests, value: totalGuests, sub: fmt(t.statPeople, { n: totalPeople }), icon: Users, tone: "bg-sky-50 border-sky-100 text-sky-700" },
    { label: t.statConfirmed, value: status.CONFIRMED.guests, sub: fmt(t.peopleCount, { n: status.CONFIRMED.people }), icon: CheckCircle2, tone: "bg-emerald-50 border-emerald-100 text-emerald-700" },
    { label: t.statInvited, value: status.INVITED.guests, sub: fmt(t.peopleCount, { n: status.INVITED.people }), icon: Mail, tone: "bg-violet-50 border-violet-100 text-violet-700" },
    { label: t.statPending, value: status.PENDING.guests, sub: fmt(t.peopleCount, { n: status.PENDING.people }), icon: Clock, tone: "bg-amber-50 border-amber-100 text-amber-700" },
    { label: t.statDeclined, value: status.DECLINED.guests, sub: fmt(t.peopleCount, { n: status.DECLINED.people }), icon: XCircle, tone: "bg-brand-50 border-brand-100 text-brand-700" },
  ];

  return (
    <div className="space-y-4">
      {/* Event hero */}
      <section className={`${card} overflow-hidden p-0`}>
        <div className="flex flex-col md:flex-row">
          <div className="relative aspect-[2/1] bg-gradient-to-br from-brand-100 via-brand-50 to-amber-200 md:aspect-auto md:w-80 md:shrink-0">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element -- auth-gated route
              <img src={cover} alt="" className={`absolute inset-0 ${coverFit}`} />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-6xl">💍</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${chip} bg-brand-50 text-brand-700`}>{t[`eventType_${event.eventType}`]}</span>
              <span className={`${chip} ${days >= 0 ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                {days > 0 ? fmt(t.daysLeft, { n: days }) : days === 0 ? t.today : t.eventPassed}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-brand-700">
              {event.groomName} <span className="text-brand-300">♥</span> {event.brideName}
            </h1>
            {event.title && <p className="text-stone-700">{event.title}</p>}
            <p className="flex items-center gap-2 text-sm text-stone-600">
              <CalendarDays className="size-4 text-brand-400" />
              {formatDateTime(event.startsAt, lang)}
            </p>
            {(event.venue || event.address) && (
              <p className="flex items-start gap-2 text-sm text-stone-600">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
                <span>
                  {[event.venue, event.address].filter(Boolean).join(" — ")}
                  {event.mapUrl && (
                    <>
                      {" · "}
                      <a href={event.mapUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">
                        {t.openMap}
                      </a>
                    </>
                  )}
                </span>
              </p>
            )}
            {event.notes && <p className="whitespace-pre-line text-sm text-stone-500">{event.notes}</p>}
            <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2">
              <ConfirmButton action={deleteEvent.bind(null, id)} confirm={t.confirmDeleteEvent} className={btnDanger}>
                <Trash2 className="size-4" />
                {t.delete}
              </ConfirmButton>
              <Link href={`/events/${id}/edit`} className={btnPrimary}>
                <Pencil className="size-4" />
                {t.editEventInfo}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, sub, icon: Icon, tone }, i) => (
          <div key={label} className={`rounded-2xl border p-4 ${tone} ${i === 0 ? "col-span-2 md:col-span-1" : ""}`}>
            <div className="flex items-start justify-between">
              <span className="text-3xl font-bold">{value}</span>
              <Icon className="size-5 opacity-70" />
            </div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs opacity-75">{sub}</p>
          </div>
        ))}
      </section>

      {/* Money: gifts received vs expenses → profit or loss */}
      <FinanceSummary eventId={id} currency={event.currency} rate={event.exchangeRate} t={t} />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <h2 className="mb-4 font-semibold">{t.guestStatusChart}</h2>
          <Donut
            centerValue={totalGuests}
            centerLabel={t.guests}
            segments={STATUSES.map((s) => ({ label: t[`status_${s}`], value: status[s].guests, color: STATUS_COLOR[s] }))}
          />
        </div>

        <div className={card}>
          <h2 className="mb-3 font-semibold">{t.guestStats}</h2>
          <ul className="divide-y divide-dashed divide-stone-200 text-sm">
            {STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2" style={{ color: STATUS_COLOR[s] }}>
                  <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                  {t[`status_${s}`]}
                </span>
                <span className="text-stone-600">
                  <b className="text-stone-800">{status[s].guests}</b> · {fmt(t.peopleCount, { n: status[s].people })}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2 font-medium">
              <span>{t.totalPeople}</span>
              <span className="text-brand-700">{totalPeople}</span>
            </li>
          </ul>
          <h3 className="mb-2 mt-4 text-sm font-semibold text-stone-700">{t.bySide}</h3>
          <div className="space-y-2">
            {SIDES.map((s) => {
              const row = bySide.find((r) => r.side === s);
              const n = row?._count ?? 0;
              return (
                <div key={s} className="text-xs">
                  <div className="mb-1 flex justify-between text-stone-600">
                    <span>{t[`side_${s}`]}</span>
                    <span>
                      {n} · {fmt(t.peopleCount, { n: row?._sum.invitedCount ?? 0 })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-brand-400"
                      style={{ width: `${totalGuests ? (n / totalGuests) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={card}>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <CalendarDays className="size-5 text-brand-600" />
            {t.agenda}
          </h2>
          {programme.length ? (
            <div className="space-y-4">
              {programme.map((day, d) => (
                <div key={d}>
                  {(day.title || day.date) && (
                    <p className="mb-2 text-sm font-semibold text-stone-700">{[day.title, day.date].filter(Boolean).join(" · ")}</p>
                  )}
                  <ol className="relative space-y-3 border-l-2 border-dashed border-brand-200 pl-4 text-sm">
                    {day.items.map((item, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full border-2 border-white bg-brand-500" />
                        {item.time && <b className="mr-1.5 font-medium text-brand-700">{item.time}</b>}
                        {item.text}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-stone-500">
              <span className="text-3xl">🗓️</span>
              <Link href={`/events/${id}/template`} className="font-medium text-brand-600 hover:underline">
                + {t.agenda}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* RSVP replies from the public invitation */}
      <section className={card}>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <MessageCircleHeart className="size-5 text-brand-600" />
          {t.rsvpReplies}
          <span className="text-sm font-normal text-stone-500">({rsvps.length})</span>
        </h2>
        {rsvps.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">{t.noRsvp}</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {rsvps.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
                <span className="font-medium text-stone-800">{r.name}</span>
                {r.phone && <span className="text-stone-500">{r.phone}</span>}
                <span className={`${chip} ${RSVP_CHIP[r.answer]}`}>{t[`rsvp_${r.answer}`]}</span>
                {r.answer !== "NO" && <span className="text-stone-500">{fmt(t.peopleCount, { n: r.count })}</span>}
                <span className="ml-auto text-xs text-stone-400">{formatDateTime(r.createdAt, lang)}</span>
                {r.message && <p className="w-full text-stone-600">“{r.message}”</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
