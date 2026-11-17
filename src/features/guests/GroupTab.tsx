"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { RemoveGroupButton } from "@/features/guests/RemoveGroupButton";

/**
 * A group tab with its own tools: ✎ renames the group in place (Enter / leaving the field saves,
 * Esc cancels) and × removes it. `children` is the tab's link, hidden while renaming.
 */
export function GroupTab({
  name,
  active,
  rename,
  remove,
  leaveHref,
  t,
  children,
}: {
  name: string;
  active: boolean;
  rename: (to: string) => Promise<string>;
  remove: () => Promise<void>;
  leaveHref?: string;
  t: { delete: string; removeGroup: string; removeGroupConfirm: string; renameGroup: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const done = useRef(false); // Enter saves, then the blur that follows must not save again

  function save(input: HTMLInputElement) {
    if (done.current) return;
    done.current = true;
    const to = input.value.trim();
    if (!to || to === name) return setEditing(false);
    start(async () => {
      const saved = await rename(to);
      setEditing(false);
      // the open tab was this group: follow it to its new name
      if (saved && active) {
        const next = new URLSearchParams(params);
        next.set("group", saved);
        router.replace(`${pathname}?${next}`, { scroll: false });
      }
    });
  }

  const iconBtn = `inline-flex size-6 items-center justify-center rounded-full transition ${
    active ? "text-white/70 hover:bg-white/20 hover:text-white" : "text-stone-400 hover:bg-brand-100 hover:text-brand-700"
  }`;

  if (editing || pending) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white py-0.5 pl-1 pr-1.5 ring-2 ring-brand-300">
        <input
          autoFocus
          defaultValue={name}
          maxLength={80}
          disabled={pending}
          aria-label={t.renameGroup}
          size={Math.max(6, name.length + 2)}
          onFocus={(e) => {
            done.current = false;
            e.currentTarget.select();
          }}
          onBlur={(e) => save(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save(e.currentTarget);
            }
            if (e.key === "Escape") {
              done.current = true;
              setEditing(false);
            }
          }}
          className="min-w-0 rounded-full bg-transparent px-2 py-0.5 text-sm text-stone-800 outline-none disabled:opacity-60"
        />
        {pending && <Loader2 className="size-3.5 animate-spin text-brand-600" />}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full text-sm transition ${
        active ? "bg-brand-600 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-brand-50 hover:text-brand-700"
      }`}
    >
      {children}
      <button type="button" onClick={() => setEditing(true)} title={t.renameGroup} aria-label={t.renameGroup} className={iconBtn}>
        <Pencil className="size-3" />
      </button>
      <RemoveGroupButton remove={remove} leaveHref={leaveHref} active={active} t={t} />
    </span>
  );
}
