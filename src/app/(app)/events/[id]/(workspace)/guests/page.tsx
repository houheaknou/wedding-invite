import Link from "next/link";
import type { GuestSide, GuestStatus, Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Pencil, Send, Upload, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/features/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { PAGE_SIZES, SIDES, STATUSES } from "@/lib/constants";
import { deleteGuest, importGuests, patchGuest, quickAddGuest, removeGroup, renameGroup, saveGuestDetails } from "@/features/guests/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { TelegramShareButton } from "@/components/TelegramShareButton";
import { Dropdown } from "@/components/Dropdown";
import { GuestFilters } from "@/features/guests/GuestFilters";
import { GuestTabs, NO_GROUP } from "@/features/guests/GuestTabs";
import { GuestForm } from "@/features/guests/GuestForm";
import { DeleteGuestButton, GuestQuickAdd, GuestSheetCard, GuestSheetRow } from "@/features/guests/GuestSheet";
import { ImportForm } from "@/components/ImportForm";
import { Modal } from "@/components/Modal";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { btnIcon, btnSecondary, card } from "@/components/ui";
import { pick, GUEST_FORM_KEYS, GUEST_SHEET_KEYS, IMPORT_FORM_KEYS } from "@/lib/ui-keys";

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
    group: group === NO_GROUP ? null : group,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { group: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [matching, totals, groupRows, invitation, bySide, byGroup] = await Promise.all([
    prisma.guest.count({ where }),
    prisma.guest.aggregate({ where: { eventId: id }, _count: true, _sum: { invitedCount: true } }),
    prisma.guest.findMany({
      where: { eventId: id, group: { not: null } },
      distinct: ["group"],
      select: { group: true },
      orderBy: { group: "asc" },
    }),
    prisma.invitation.findUnique({ where: { eventId: id }, select: { shareId: true, published: true, lang: true } }),
    // tab counts: guests per side, and per group within the chosen side
    prisma.guest.groupBy({ by: ["side"], where: { eventId: id }, _count: true }),
    prisma.guest.groupBy({ by: ["group"], where: { eventId: id, side }, _count: true }),
  ]);
  const sideCounts = {
    all: totals._count,
    ...Object.fromEntries(bySide.map((r) => [r.side, r._count])),
  } as Parameters<typeof GuestTabs>[0]["sideCounts"];
  // largest groups first, "no group" last
  const groupCounts = byGroup
    .map((r) => ({ group: r.group, n: r._count }))
    .sort((a, b) => (a.group === null ? 1 : b.group === null ? -1 : b.n - a.n || a.group.localeCompare(b.group)));
  const pages = Math.max(1, Math.ceil(matching / size));
  const page = Math.min(Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1), pages);
  const guests = await prisma.guest.findMany({
    where,
    orderBy: { createdAt: "desc" }, // newest first: a guest just added appears at the top
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

  // Telegram message details (the invitation's language; the guest's name is added per row)
  const shareEvent = {
    lang: invitation?.lang === "en" ? ("en" as const) : ("km" as const),
    groomName: event.groomName,
    brideName: event.brideName,
    groomNameEn: event.groomNameEn,
    brideNameEn: event.brideNameEn,
    startsAt: event.startsAt.toISOString(),
    venue: event.venue,
    venueEn: event.venueEn,
    address: event.address,
  };
  const sheetT = pick(t, GUEST_SHEET_KEYS);
  const groupNames = groupRows.map((g) => g.group!).filter(Boolean);
  const save = patchGuest.bind(null, id);
  const sheetGuest = (g: (typeof guests)[number]) => ({
    id: g.id,
    name: g.name,
    phone: g.phone,
    side: g.side,
    group: g.group,
    invitedCount: g.invitedCount,
    status: g.status,
    notes: g.notes,
  });
  const formT = pick(t, GUEST_FORM_KEYS);
  // The pencil opens the full form (with notes) in a popup; the form is built on each open, so it
  // shows edits made in the list since the last time
  const editPopup = (g: (typeof guests)[number]) => (
    <Modal
      key="edit"
      title={t.editGuest}
      closeLabel={t.close}
      resetOnClose
      triggerClassName="inline-flex size-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      trigger={<Pencil className="size-3.5" aria-label={t.edit} />}
    >
      <GuestForm action={saveGuestDetails.bind(null, id, g.id)} t={formT} guest={g} />
    </Modal>
  );
  const rowActions = (guestId: string, guestName: string) => (
    <div key="actions" className="flex justify-end gap-1.5">
      {invitation?.published && (
        <>
          <TelegramShareButton
            compact
            path={`/i/${invitation.shareId}/${guestId}`}
            label={t.shareTelegram}
            message={{ ...shareEvent, guestName }}
            askTerm={t.tgAddressAs}
          />
          <CopyLinkButton path={`/i/${invitation.shareId}/${guestId}`} label={t.copyInviteLink} />
        </>
      )}
      <DeleteGuestButton remove={deleteGuest.bind(null, id, guestId)} t={sheetT} />
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
        <GuestTabs
          sp={sp}
          side={side}
          group={group}
          sideCounts={sideCounts}
          groupCounts={groupCounts}
          removeGroup={removeGroup.bind(null, id)}
          renameGroup={renameGroup.bind(null, id)}
          t={{
            all: t.all,
            group: t.group,
            noGroup: t.noGroup,
            delete: t.delete,
            removeGroup: t.removeGroup,
            removeGroupConfirm: t.removeGroupConfirm,
            renameGroup: t.renameGroup,
            side_BRIDE: t.side_BRIDE,
            side_GROOM: t.side_GROOM,
            side_BOTH: t.side_BOTH,
          }}
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <GuestFilters labels={filterLabels} />
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
          </div>
        </div>

        {/* adds to the side / group of the open tab */}
        <GuestQuickAdd
          key={`${side ?? ""}|${group ?? ""}`}
          add={quickAddGuest.bind(null, id)}
          groups={groupNames}
          renameGroup={renameGroup.bind(null, id)}
          t={sheetT}
          defaultSide={side}
          defaultGroup={group && group !== NO_GROUP ? group : ""}
        />

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
                    <GuestSheetRow key={g.id} g={sheetGuest(g)} save={save} t={sheetT} edit={editPopup(g)} actions={rowActions(g.id, g.name)} groups={groupNames} renameGroup={renameGroup.bind(null, id)} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
              {guests.map((g) => (
                <GuestSheetCard key={g.id} g={sheetGuest(g)} save={save} t={sheetT} edit={editPopup(g)} actions={rowActions(g.id, g.name)} groups={groupNames} renameGroup={renameGroup.bind(null, id)} />
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
