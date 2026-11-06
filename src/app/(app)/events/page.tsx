import Link from "next/link";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmt, getDict } from "@/lib/i18n";
import { coverUrl, daysUntil, formatDateTime } from "@/lib/format";
import { btnPrimary, card, chip } from "@/components/ui";

export default async function EventsPage() {
  const user = await requireUser();
  const { t, lang } = await getDict();
  const events = await prisma.event.findMany({
    where: { ownerId: user.id },
    orderBy: { startsAt: "asc" },
    omit: { coverImage: true },
    include: { _count: { select: { guests: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold sm:text-2xl">{t.myEvents}</h1>
        <Link href="/events/new" className={btnPrimary}>
          <Plus className="size-4" />
          {t.newEvent}
        </Link>
      </div>
      {events.length === 0 ? (
        <div className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
          <span className="text-5xl">💌</span>
          <p className="text-stone-500">{t.noEvents}</p>
          <Link href="/events/new" className={btnPrimary}>
            <Plus className="size-4" />
            {t.newEvent}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const cover = coverUrl(e);
            const days = daysUntil(e.startsAt);
            return (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="group block overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-900/5"
                >
                  <div className="relative aspect-[2/1] bg-gradient-to-br from-brand-100 via-brand-50 to-amber-200">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- auth-gated route
                      <img src={cover} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-5xl transition group-hover:scale-110">
                        💍
                      </span>
                    )}
                    <span className={`${chip} absolute left-3 top-3 bg-white/90 text-brand-700 shadow-sm`}>
                      {t[`eventType_${e.eventType}`]}
                    </span>
                    {days >= 0 && (
                      <span className={`${chip} absolute right-3 top-3 bg-brand-600 text-white shadow-sm`}>
                        {days === 0 ? t.today : fmt(t.daysLeft, { n: days })}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-lg font-bold text-brand-700">
                      {e.groomName} <span className="text-brand-300">♥</span> {e.brideName}
                    </p>
                    {e.title && <p className="text-sm text-stone-700">{e.title}</p>}
                    <p className="flex items-center gap-1.5 text-sm text-stone-600">
                      <CalendarDays className="size-4 text-brand-400" />
                      {formatDateTime(e.startsAt, lang)}
                    </p>
                    {e.venue && (
                      <p className="flex items-center gap-1.5 truncate text-sm text-stone-500">
                        <MapPin className="size-4 shrink-0 text-brand-400" />
                        <span className="truncate">{e.venue}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 pt-1 text-xs text-stone-500">
                      <Users className="size-3.5" />
                      {t.guests}: {e._count.guests}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
