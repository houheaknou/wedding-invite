"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { SIDES, STATUSES } from "@/lib/constants";

const pill =
  "h-9 rounded-full border border-stone-200/70 bg-stone-100/70 px-3 text-sm outline-none transition focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100";

type Labels = {
  searchPlaceholder: string;
  group: string;
  side: string;
  status: string;
  all: string;
  clear: string;
} & Record<`side_${(typeof SIDES)[number]}` | `status_${(typeof STATUSES)[number]}`, string>;

/** Search + filter pills that update the URL query (and reset to page 1). */
export function GuestFilters({ groups, labels }: { groups: string[]; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  // Debounce typing in the search box
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => update({ q: q.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the text changes
  }, [q]);

  const filtered = ["q", "group", "side", "status"].some((k) => params.get(k));

  return (
    <div className={`flex flex-1 flex-wrap items-center gap-2 transition ${pending ? "opacity-70" : ""}`}>
      <label className="relative min-w-0 flex-1 basis-full sm:max-w-64 sm:basis-auto">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className={`${pill} w-full pl-9`}
          type="search"
        />
      </label>
      <select
        aria-label={labels.group}
        value={params.get("group") ?? ""}
        onChange={(e) => update({ group: e.target.value })}
        className={`${pill} max-w-40`}
      >
        <option value="">
          {labels.group}: {labels.all}
        </option>
        {groups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        aria-label={labels.side}
        value={params.get("side") ?? ""}
        onChange={(e) => update({ side: e.target.value })}
        className={pill}
      >
        <option value="">
          {labels.side}: {labels.all}
        </option>
        {SIDES.map((s) => (
          <option key={s} value={s}>
            {labels[`side_${s}`]}
          </option>
        ))}
      </select>
      <select
        aria-label={labels.status}
        value={params.get("status") ?? ""}
        onChange={(e) => update({ status: e.target.value })}
        className={pill}
      >
        <option value="">
          {labels.status}: {labels.all}
        </option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {labels[`status_${s}`]}
          </option>
        ))}
      </select>
      {filtered && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            first.current = true;
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-brand-700 hover:bg-brand-50"
        >
          <X className="size-4" />
          {labels.clear}
        </button>
      )}
    </div>
  );
}
