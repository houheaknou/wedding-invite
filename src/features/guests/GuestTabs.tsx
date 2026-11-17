import Link from "next/link";
import type { GuestSide } from "@prisma/client";
import { SIDES } from "@/lib/constants";

/** `?group=` value for guests with no group (shown as the "Other" tab) */
export const NO_GROUP = "-";

const SIDE_DOT: Record<GuestSide, string> = {
  BRIDE: "bg-brand-600",
  GROOM: "bg-sky-600",
  BOTH: "bg-stone-400",
};

/**
 * Side tabs (all / groom's / bride's / both) and, under them, a tab per group of the chosen side —
 * each with its number of guests. They are plain links on the query string (search and status are
 * kept, the page resets to 1).
 */
export function GuestTabs({
  sp,
  side,
  group,
  sideCounts,
  groupCounts,
  t,
}: {
  sp: Record<string, string | undefined>;
  side?: GuestSide;
  group?: string;
  sideCounts: Partial<Record<GuestSide, number>> & { all: number };
  /** groups of the selected side (null = no group), largest first */
  groupCounts: { group: string | null; n: number }[];
  t: { all: string; group: string; noGroup: string } & Record<`side_${GuestSide}`, string>;
}) {
  const href = (changes: { side?: string; group?: string }) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page" && k !== "side" && k !== "group") next.set(k, v);
    if (changes.side) next.set("side", changes.side);
    if (changes.group) next.set("group", changes.group);
    const qs = next.toString();
    return qs ? `?${qs}` : "?";
  };
  const groupTotal = groupCounts.reduce((sum, g) => sum + g.n, 0);

  return (
    <div className="space-y-2.5">
      {/* side tabs: a 2×2 segmented block on phones (all four visible), underlined tabs from sm up */}
      <nav
        className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1 sm:flex sm:gap-1 sm:rounded-none sm:border-b sm:border-stone-200 sm:bg-transparent sm:p-0"
        aria-label="side"
      >
        {([undefined, ...SIDES] as (GuestSide | undefined)[]).map((s) => {
          const active = side === s;
          const n = s ? sideCounts[s] ?? 0 : sideCounts.all;
          return (
            <Link
              key={s ?? "all"}
              href={href({ side: s })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-2 text-sm transition sm:-mb-px sm:shrink-0 sm:justify-start sm:gap-2 sm:rounded-none sm:border-b-2 sm:px-3 ${
                active
                  ? "bg-white font-semibold text-brand-700 shadow-sm sm:border-brand-600 sm:bg-transparent sm:shadow-none"
                  : "text-stone-500 hover:text-stone-800 sm:border-transparent sm:hover:border-stone-300"
              }`}
            >
              {s && <span className={`size-2 rounded-full ${SIDE_DOT[s]}`} />}
              {s ? t[`side_${s}`] : t.all}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-brand-100 text-brand-700" : "bg-white text-stone-500 sm:bg-stone-100"}`}>{n}</span>
            </Link>
          );
        })}
      </nav>

      {/* group tabs of the chosen side */}
      {groupCounts.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label={t.group}>
          <span className="mr-1 text-xs text-stone-500">{t.group}:</span>
          {[{ group: undefined as string | null | undefined, n: groupTotal }, ...groupCounts].map((g) => {
            const value = g.group === undefined ? undefined : g.group ?? NO_GROUP;
            const active = group === value;
            return (
              <Link
                key={value ?? "*all"}
                href={href({ side, group: value })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition ${
                  active ? "bg-brand-600 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {g.group === undefined ? t.all : g.group ?? t.noGroup}
                <span className={`text-xs ${active ? "text-white/80" : "text-stone-400"}`}>{g.n}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
