"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, LayoutGrid, Loader2, Palette, Plus, Receipt, Users } from "lucide-react";

const TABS = [
  { slug: "", icon: LayoutGrid, key: "tabDashboard" },
  { slug: "guests", icon: Users, key: "tabGuests" },
  { slug: "expenses", icon: Receipt, key: "tabExpenses" },
  { slug: "gifts", icon: Gift, key: "tabGifts" },
  { slug: "template", icon: Palette, key: "tabTemplate" },
  { slug: "more", icon: Plus, key: "tabMore" },
] as const;

export type TabLabels = Record<(typeof TABS)[number]["key"], string>;

/**
 * Segmented icon tab bar for an event's workspace. The tapped tab lights up (with a spinner) right
 * away, before the server answers: over a phone connection that round trip is what felt slow.
 */
export function WorkspaceTabs({ eventId, labels }: { eventId: string; labels: TabLabels }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;
  const current = pathname.slice(base.length + 1).split("/")[0];
  // the tab being opened; dropped once the URL shows it (or another tab)
  const [pending, setPending] = useState<{ slug: string; from: string } | null>(null);
  const loading = pending && pending.from === pathname ? pending.slug : null;
  const active = loading ?? current;

  return (
    <nav className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      <ul className="inline-flex min-w-full gap-1 rounded-2xl bg-stone-100/80 p-1 sm:min-w-0">
        {TABS.map(({ slug, icon: Icon, key, ...rest }) => {
          const isActive = active === slug;
          const soon = "soon" in rest;
          return (
            <li key={slug} className="flex-1 sm:flex-none">
              <Link
                href={slug ? `${base}/${slug}` : base}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || slug === current) return;
                  setPending({ slug, from: pathname });
                }}
                className={`relative flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[11px] whitespace-nowrap transition sm:min-w-20 sm:text-xs ${
                  isActive
                    ? "bg-white font-semibold text-brand-600 shadow-sm"
                    : "text-stone-500 hover:bg-white/60 hover:text-stone-800"
                }`}
              >
                {loading === slug ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" />}
                {labels[key]}
                {soon && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-300" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
