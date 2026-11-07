import Link from "next/link";
import type { GuestSide, GuestStatus, Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Pencil, Phone, Plus, Send, Trash2, Upload, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { PAGE_SIZES, SIDE_CHIP, SIDES, STATUS_CHIP, STATUSES } from "@/lib/constants";
import { addGuest, deleteGuest, importGuests } from "@/features/guests/actions";
import { ClickableRow } from "@/components/ClickableRow";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { TelegramShareButton } from "@/components/TelegramShareButton";
import { Dropdown } from "@/components/Dropdown";
import { GuestFilters } from "@/features/guests/GuestFilters";
import { GuestForm } from "@/features/guests/GuestForm";
import { ImportForm } from "@/components/ImportForm";
import { Modal } from "@/components/Modal";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Avatar, btnIcon, btnPrimary, btnSecondary, card, chip } from "@/components/ui";
import { pick, GUEST_FORM_KEYS, IMPORT_FORM_KEYS } from "@/lib/ui-keys";

type SearchParams = { q?: string; group?: string; side?: string; status?: string; page?: string; size?: string };

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);
  const { t } = await getDict();
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const group = sp.group?.trim() || undefined;
  const side = SIDES.includes(sp.side as GuestSide) ? (sp.side as GuestSide) : undefined;
  const status = STATUSES.includes(sp.status as GuestStatus) ? (sp.status as GuestStatus) : undefined;
  const size = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : PAGE_SIZES[0];
  const filtered = Boolean(q || group || side || status);

  const where: Prisma.GuestWhereInput = {
    eventId: id,
    side,
    status,
    group,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { group: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [matching, totals, groupRows, invitation] = await Promise.all([
    prisma.guest.count({ where }),
    prisma.guest.aggregate({ where: { eventId: id }, _count: true, _sum: { invitedCount: true } }),
    prisma.guest.findMany({
      where: { eventId: id, group: { not: null } },
      distinct: ["group"],
      select: { group: true },
      orderBy: { group: "asc" },
    }),
    prisma.invitation.findUnique({ where: { eventId: id }, select: { shareId: true, published: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(matching / size));
  const page = Math.min(Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1), pages);
  const guests = await prisma.guest.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * size,
    take: size,
  });

  const exportBase = `/api/events/${id}/guests/export`;
  const pageHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    next.set("page", String(p));
    return `?${next}`;
  };
  const filterLabels = {
    searchPlaceholder: t.searchPlaceholder,
    group: t.group,
    side: t.side,
    status: t.status,
    all: t.all,
    clear: t.clear,
    ...Object.fromEntries(SIDES.map((s) => [`side_${s}`, t[`side_${s}`]])),
    ...Object.fromEntries(STATUSES.map((s) => [`status_${s}`, t[`status_${s}`]])),
  } as Parameters<typeof GuestFilters>[0]["labels"];

  const couple = `${event.groomName} & ${event.brideName}`;
  const rowActions = (guestId: string, guestName: string) => (
    <div className="flex justify-end gap-1.5">
      {invitation?.published && (
        <>
          <TelegramShareButton
            compact
            path={`/i/${invitation.shareId}/${guestId}`}
            label={t.shareTelegram}
            text={fmt(t.tgGuestText, { name: guestName, couple })}
          />
          <CopyLinkButton path={`/i/${invitation.shareId}/${guestId}`} label={t.copyInviteLink} />
        </>
      )}
      <Link href={`/events/${id}/guests/${guestId}/edit`} className={btnIcon} title={t.edit} aria-label={t.edit}>
        <Pencil className="size-3.5" />
      </Link>
      <ConfirmButton
        action={deleteGuest.bind(null, id, guestId)}
        confirm={t.confirmDelete}
        className={`${btnIcon} hover:text-red-600`}
      >
        <Trash2 className="size-3.5" aria-label={t.delete} />
      </ConfirmButton>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-bold">{t.guestManagement}</h1>
        <span className="inline-flex items-center gap-1 text-sm text-stone-600">
          <Users className="size-4" />
          {totals._count}
          <span className="text-stone-400">· {fmt(t.peopleCount, { n: totals._sum.invitedCount ?? 0 })}</span>
        </span>
      </div>

      {!invitation?.published && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Send className="size-4 shrink-0 text-sky-600" />
          <span className="flex-1">{t.tgNotPublished}</span>
          <Link href={`/events/${id}/template`} className="font-medium text-sky-700 hover:underline">
            {t.openTemplate} →
          </Link>
        </div>
      )}

      <section className={`${card} space-y-4 p-3 sm:p-5`}>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <GuestFilters groups={groupRows.map((g) => g.group!).filter(Boolean)} labels={filterLabels} />
          <div className="flex items-center gap-2">
            <Modal
              title={t.import}
              closeLabel={t.close}
              triggerClassName={`${btnSecondary} px-4`}
              trigger={
                <>
                  <Upload className="size-4" />
                  {t.import}
                </>
              }
            >
              <ImportForm action={importGuests.bind(null, id)} t={pick(t, IMPORT_FORM_KEYS)} templateHref={`${exportBase}?format=xlsx&template=1`} />
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
              title={t.addGuest}
              closeLabel={t.close}
              triggerClassName={btnPrimary}
              trigger={
                <>
                  <Plus className="size-4" />
                  {t.add}
                </>
              }
            >
              <GuestForm action={addGuest.bind(null, id)} t={pick(t, GUEST_FORM_KEYS)} />
            </Modal>
          </div>
        </div>

        {guests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-stone-500">
            <span className="text-4xl">{filtered ? "🔍" : "🫶"}</span>
            {filtered ? t.noMatches : t.noGuests}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-stone-100 md:block">
              <table className="w-full text-sm">
                <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t.name}</th>
                    <th className="px-3 py-2.5 font-medium">{t.phone}</th>
                    <th className="px-3 py-2.5 font-medium">{t.side}</th>
                    <th className="px-3 py-2.5 font-medium">{t.group}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t.invitedCount}</th>
                    <th className="px-3 py-2.5 font-medium">{t.status}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {guests.map((g) => (
                    <ClickableRow key={g.id} href={`/events/${id}/guests/${g.id}/edit`} className="transition hover:bg-brand-50/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={g.name} />
                          <div className="min-w-0">
                            <Link href={`/events/${id}/guests/${g.id}/edit`} className="font-medium text-stone-800 hover:text-brand-700 hover:underline">
                              {g.name}
                            </Link>
                            {g.notes && <div className="truncate text-xs text-stone-500">{g.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-stone-600">{g.phone || <span className="text-stone-300">—</span>}</td>
                      <td className="px-3 py-2.5">
                        <span className={`${chip} ${SIDE_CHIP[g.side]}`}>{t[`side_${g.side}`]}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {g.group ? (
                          <span className={`${chip} bg-stone-100 text-stone-600`}>{g.group}</span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">{g.invitedCount}</td>
                      <td className="px-3 py-2.5">
                        <span className={`${chip} ${STATUS_CHIP[g.status]}`}>{t[`status_${g.status}`]}</span>
                      </td>
                      <td className="px-4 py-2">{rowActions(g.id, g.name)}</td>
                    </ClickableRow>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
              {guests.map((g) => (
                <ClickableRow as="li" key={g.id} href={`/events/${id}/guests/${g.id}/edit`} className="flex gap-3 rounded-2xl border border-stone-100 p-3 transition hover:bg-brand-50/60">
                  <Avatar name={g.name} className="size-10 text-sm" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/events/${id}/guests/${g.id}/edit`} className="block truncate font-medium">
                          {g.name}
                        </Link>
                        {g.phone && (
                          <p className="flex items-center gap-1 text-xs text-stone-500">
                            <Phone className="size-3" />
                            {g.phone}
                          </p>
                        )}
                      </div>
                      {rowActions(g.id, g.name)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className={`${chip} ${SIDE_CHIP[g.side]}`}>{t[`side_${g.side}`]}</span>
                      {g.group && <span className={`${chip} bg-stone-100 text-stone-600`}>{g.group}</span>}
                      <span className={`${chip} ${STATUS_CHIP[g.status]}`}>{t[`status_${g.status}`]}</span>
                      <span className={`${chip} bg-white text-stone-600 ring-1 ring-stone-200`}>
                        <Users className="mr-1 size-3" />
                        {g.invitedCount}
                      </span>
                    </div>
                    {g.notes && <p className="text-xs text-stone-500">{g.notes}</p>}
                  </div>
                </ClickableRow>
              ))}
            </ul>
          </>
        )}

        {/* Footer / pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-stone-500">{fmt(t.totalRecords, { n: matching })}</span>
          <div className="flex items-center gap-3">
            <PageSizeSelect value={size} label={t.rowsPerPage} />
            <span className="text-xs text-stone-500">{fmt(t.pageOf, { page, pages })}</span>
            <div className="flex gap-1">
              {(
                [
                  [1, ChevronsLeft],
                  [page - 1, ChevronLeft],
                  [page + 1, ChevronRight],
                  [pages, ChevronsRight],
                ] as const
              ).map(([p, Icon], i) => {
                const disabled = p < 1 || p > pages || p === page;
                return disabled ? (
                  <span key={i} className={`${btnIcon} pointer-events-none opacity-40`}>
                    <Icon className="size-4" />
                  </span>
                ) : (
                  <Link key={i} href={pageHref(p)} scroll={false} className={btnIcon}>
                    <Icon className="size-4" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
