"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { GuestSide, GuestStatus } from "@prisma/client";
import type { GuestPatch, SheetResult } from "@/features/guests/actions";
import { SIDE_CHIP, SIDES, STATUS_CHIP, STATUSES } from "@/lib/constants";
import { Avatar } from "@/components/ui";
import type { GuestSheetDict } from "@/lib/ui-keys";

/**
 * Spreadsheet-style guest list: a quick-add row (type, Enter, next guest) and rows whose cells are
 * edited in place and saved on their own — no form to open for the everyday changes. The full form
 * (notes) opens in a popup from the pencil.
 */

export type SheetGuest = {
  id: string;
  name: string;
  phone: string | null;
  side: GuestSide;
  group: string | null;
  invitedCount: number;
  status: GuestStatus;
  notes: string | null;
};

type Save = (patch: GuestPatch) => Promise<SheetResult>;
type Flash = "idle" | "saving" | "saved" | "error";

const cellBase =
  "w-full min-w-0 rounded-lg border bg-transparent px-2 py-1.5 outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-200";
const flashCls: Record<Flash, string> = {
  idle: "border-transparent hover:border-stone-200 focus:border-brand-300",
  saving: "border-brand-200 opacity-70",
  saved: "border-emerald-300 bg-emerald-50/60",
  error: "border-red-300 bg-red-50",
};

/** Run a save, show its state on the cell for a moment. */
function useFlash() {
  const [flash, setFlash] = useState<Flash>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const run = async (fn: () => Promise<SheetResult>) => {
    clearTimeout(timer.current);
    setFlash("saving");
    let res: SheetResult;
    try {
      res = await fn();
    } catch {
      res = { ok: false, error: "" };
    }
    setFlash(res.ok ? "saved" : "error");
    timer.current = setTimeout(() => setFlash("idle"), res.ok ? 1200 : 2500);
    return res.ok;
  };
  return { flash, run };
}

/* ───────────── pick from existing groups ───────────── */

/**
 * The groups already used, offered under a group field: all of them when it gets focus, then the
 * ones matching what is typed. Arrow keys + Enter, or click, to pick; typing a new name still works.
 */
function useSuggest(options: string[]) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(""); // "" = show every group
  const [hi, setHi] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const list = options.filter((o) => !q || o.toLowerCase().includes(q));
  return {
    open: open && list.length > 0,
    listRef,
    /** focus went into the list (its rename box): the field keeps the list open and doesn't save */
    inside: (el: EventTarget | null) => Boolean(el && listRef.current?.contains(el as Node)),
    list,
    hi,
    showAll: () => {
      setOpen(true);
      setQuery("");
      setHi(-1);
    },
    typed: (v: string) => {
      setOpen(true);
      setQuery(v);
      setHi(-1);
    },
    close: () => setOpen(false),
    /** arrow keys move the highlight; returns the group Enter picked, or null */
    key: (e: React.KeyboardEvent): string | null => {
      if (!open || list.length === 0) return null;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setHi((h) => (h + step + list.length) % list.length);
      }
      if (e.key === "Enter" && hi >= 0) return list[hi];
      return null;
    },
  };
}

type GroupToolLabels = { renameGroup: string; removeGroup: string; removeGroupConfirm: string; delete: string };

function SuggestList({
  anchor,
  s,
  current,
  onPick,
  onRename,
  onRemove,
  labels,
}: {
  anchor: HTMLInputElement | null;
  s: ReturnType<typeof useSuggest>;
  current: string;
  onPick: (group: string) => void;
  /** ✎ on each group: rename it on all its guests; resolves to the saved name ("" = unchanged) */
  onRename?: (from: string, to: string) => Promise<string>;
  /** bin on each group: take it off all its guests (two clicks) */
  onRemove?: (group: string) => Promise<void>;
  labels?: GroupToolLabels;
}) {
  const { open, close } = s;
  const [editing, setEditing] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null); // group whose bin was clicked once
  const [removing, startRemove] = useTransition();
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  const [renaming, startRename] = useTransition();
  const done = useRef(false); // Enter saves; the blur that follows must not save again

  // back: Enter / Esc return to the group field (list stays open); clicking away closes the list
  function finish(input: HTMLInputElement, from: string, mode: "save" | "cancel", back: boolean) {
    if (done.current) return;
    done.current = true;
    const to = input.value.trim();
    const after = () => {
      setEditing(null);
      if (back) anchor?.focus();
      else close();
    };
    if (mode === "cancel" || !onRename || !to || to === from) return after();
    startRename(async () => {
      await onRename(from, to);
      after();
    });
  }

  // pinned to the screen (the table scrolls sideways and would clip it): close when the page moves
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);
  if (!open || !anchor) return null;
  const r = anchor.getBoundingClientRect();
  const width = Math.max(r.width, 180);
  const below = r.bottom + 230 < window.innerHeight;
  return (
    <div
      ref={s.listRef}
      role="listbox"
      style={{
        left: Math.min(r.left, window.innerWidth - width - 8),
        width,
        ...(below ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }),
      }}
      className="fixed z-50 max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 text-sm shadow-xl"
    >
      {s.list.map((o, i) =>
        editing === o ? (
          <div key={o} className="flex items-center gap-1 rounded-lg px-1 py-0.5">
            <input
              autoFocus
              defaultValue={o}
              maxLength={80}
              disabled={renaming}
              aria-label={o}
              onFocus={(e) => {
                done.current = false;
                e.currentTarget.select();
              }}
              onBlur={(e) => finish(e.currentTarget, o, "save", false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  finish(e.currentTarget, o, "save", true);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  finish(e.currentTarget, o, "cancel", true);
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-brand-300 px-2 py-1 text-sm outline-none ring-2 ring-brand-100 disabled:opacity-60"
            />
            {renaming && <Loader2 className="size-3.5 shrink-0 animate-spin text-brand-600" />}
          </div>
        ) : (
          <div
            key={o}
            role="option"
            aria-selected={o === current}
            // mousedown, not click: keep the focus in the field so it saves on its own blur
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(o);
            }}
            className={`group flex cursor-pointer items-center gap-1 rounded-lg py-1 pl-2.5 pr-1 ${
              i === s.hi ? "bg-brand-50 text-brand-700" : "text-stone-700 hover:bg-stone-50"
            } ${o === current ? "font-semibold" : ""}`}
          >
            <span className="min-w-0 flex-1 truncate">{o}</span>
            {o === current && <span className="text-xs text-brand-600">✓</span>}
            {onRename && (
              <button
                type="button"
                title={labels?.renameGroup}
                aria-label={labels?.renameGroup}
                onMouseDown={(e) => {
                  e.preventDefault(); // not a pick
                  e.stopPropagation();
                  setEditing(o);
                }}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-brand-100 hover:text-brand-700"
              >
                <Pencil className="size-3" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                disabled={removing}
                title={armed === o ? labels?.removeGroupConfirm : labels?.removeGroup}
                aria-label={armed === o ? labels?.removeGroupConfirm : labels?.removeGroup}
                onMouseDown={(e) => {
                  e.preventDefault(); // not a pick; the field keeps the focus
                  e.stopPropagation();
                  if (armed !== o) return setArmed(o);
                  startRemove(async () => {
                    await onRemove(o);
                    setArmed(null);
                  });
                }}
                className={
                  armed === o
                    ? "inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-red-600 px-2 text-xs font-semibold text-white disabled:opacity-70"
                    : "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                }
              >
                {removing && armed === o ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                {armed === o && <span>{labels?.delete}?</span>}
              </button>
            )}
          </div>
        ),
      )}
    </div>
  );
}

/** A text/number cell: saves when you leave it (or press Enter); Esc puts the old value back. */
function TextCell({
  value,
  field,
  save,
  label,
  placeholder,
  type = "text",
  inputMode,
  required = false,
  className = "",
  options,
  onRenameOption,
  onRemoveOption,
  toolLabels,
}: {
  value: string;
  field: keyof GuestPatch;
  save: Save;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "number";
  inputMode?: "numeric" | "tel" | "text";
  required?: boolean;
  className?: string;
  /** values to pick from (the event's groups) */
  options?: string[];
  /** rename one of the options everywhere (groups): resolves to the saved name */
  onRenameOption?: (from: string, to: string) => Promise<string>;
  /** take one of the options off everywhere (groups) */
  onRemoveOption?: (option: string) => Promise<void>;
  toolLabels?: GroupToolLabels;
}) {
  const committed = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { flash, run } = useFlash();
  const suggest = useSuggest(options ?? []);
  // Saved elsewhere (the edit popup): show the new value, unless the cell is being typed in
  useEffect(() => {
    const el = inputRef.current;
    if (!el || el === document.activeElement || value === committed.current) return;
    committed.current = value;
    el.value = value;
  }, [value]);
  const commit = async (el: HTMLInputElement) => {
    const v = el.value.trim();
    if (v === committed.current) return;
    if (required && !v) {
      el.value = committed.current;
      return;
    }
    const patch = { [field]: field === "invitedCount" ? Number(v) || 1 : v } as GuestPatch;
    if (await run(() => save(patch))) committed.current = v;
    else el.value = committed.current;
  };
  const pick = (v: string) => {
    const el = inputRef.current;
    if (!el) return;
    el.value = v;
    el.blur(); // saves through onBlur
  };
  return (
    <>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        min={type === "number" ? 1 : undefined}
        defaultValue={value}
        aria-label={label}
        placeholder={placeholder}
        autoComplete={options ? "off" : undefined}
        className={`${cellBase} ${flashCls[flash]} ${className}`}
        onFocus={options ? suggest.showAll : undefined}
        onInput={options ? (e) => suggest.typed(e.currentTarget.value) : undefined}
        onBlur={(e) => {
          if (suggest.inside(e.relatedTarget)) return; // renaming a group in the list
          suggest.close();
          void commit(e.currentTarget);
        }}
        onKeyDown={(e) => {
          const picked = suggest.key(e);
          if (picked !== null) return pick(picked);
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = committed.current;
            e.currentTarget.blur();
          }
        }}
      />
      {options && (
        <SuggestList
          anchor={inputRef.current}
          s={suggest}
          current={inputRef.current?.value.trim() ?? value}
          onPick={pick}
          onRename={
            onRenameOption &&
            (async (from, to) => {
              const saved = await onRenameOption(from, to);
              // this guest was in the renamed group: the server already moved it, show the new name
              const el = inputRef.current;
              if (saved && el && el.value.trim() === from) {
                el.value = saved;
                if (committed.current === from) committed.current = saved;
              }
              return saved;
            })
          }
          onRemove={
            onRemoveOption &&
            (async (group) => {
              await onRemoveOption(group);
              // this guest was in it: the server already cleared it
              const el = inputRef.current;
              if (el && el.value.trim() === group) el.value = "";
              if (committed.current === group) committed.current = "";
            })
          }
          labels={toolLabels}
        />
      )}
    </>
  );
}

/** Side / status as a coloured chip that is a dropdown; saves as soon as you pick. */
function ChipSelect<T extends string>({
  value,
  options,
  labels,
  chip,
  onPick,
  label,
}: {
  value: T;
  options: readonly T[];
  labels: (v: T) => string;
  chip: Record<T, string>;
  onPick: (v: T) => Promise<boolean>;
  label: string;
}) {
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setCurrent(value), [value]); // saved elsewhere (the edit popup)
  return (
    <select
      aria-label={label}
      value={current}
      disabled={busy}
      onChange={async (e) => {
        const next = e.target.value as T;
        const prev = current;
        setCurrent(next);
        setBusy(true);
        if (!(await onPick(next))) setCurrent(prev);
        setBusy(false);
      }}
      className={`cursor-pointer appearance-none rounded-full border-0 px-3 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60 ${chip[current]}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {labels(o)}
        </option>
      ))}
    </select>
  );
}

function useRowSave(save: (id: string, patch: GuestPatch) => Promise<SheetResult>, id: string) {
  const { run } = useFlash();
  const saveField: Save = (patch) => save(id, patch);
  const pick = (patch: GuestPatch) => run(() => save(id, patch));
  return { saveField, pick };
}

/* ───────────── quick-add row ───────────── */

export function GuestQuickAdd({
  add,
  groups,
  t,
  defaultSide,
  defaultGroup = "",
  renameGroup,
  removeGroup,
}: {
  add: (input: GuestPatch) => Promise<SheetResult>;
  groups: string[];
  t: GuestSheetDict;
  defaultSide?: GuestSide;
  defaultGroup?: string;
  /** rename a group on all its guests (✎ in the group list) */
  renameGroup?: (from: string, to: string) => Promise<string>;
  removeGroup?: (group: string) => Promise<void>;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [side, setSide] = useState<GuestSide>(defaultSide ?? "BOTH");
  const [group, setGroup] = useState(defaultGroup);
  const groupRef = useRef<HTMLInputElement>(null);
  const groupSuggest = useSuggest(groups);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const field =
    "w-full min-w-0 rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      nameRef.current?.focus();
      return;
    }
    start(async () => {
      const res = await add({
        name,
        phone: String(fd.get("phone") ?? ""),
        side,
        group,
        invitedCount: Number(fd.get("invitedCount")) || 1,
      });
      if (res.ok) {
        // keep side and group for the next guest (families / groups are usually entered together)
        (form.elements.namedItem("name") as HTMLInputElement).value = "";
        (form.elements.namedItem("phone") as HTMLInputElement).value = "";
        (form.elements.namedItem("invitedCount") as HTMLInputElement).value = "1";
        setNote({ ok: true, text: `✓ ${t.guestAdded.replace("{name}", name)}` });
      } else {
        setNote({ ok: false, text: res.error || t.errRequired });
      }
      nameRef.current?.focus();
    });
  }

  return (
    <form
      // POST to nowhere useful if the page isn't interactive yet, instead of a GET that puts the
      // typed details in the address bar; once loaded, onSubmit handles it without leaving the page
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-3"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <Plus className="size-4" />
          {t.addGuest}
        </p>
        <p className="text-xs text-stone-500">{t.quickAddHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto_minmax(0,1.2fr)_5rem_auto]">
        <input ref={nameRef} name="name" autoComplete="off" placeholder={`${t.name} *`} aria-label={t.name} className={`${field} col-span-2 md:col-span-1`} />
        <input name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder={t.phone} aria-label={t.phone} className={field} />
        <select value={side} onChange={(e) => setSide(e.target.value as GuestSide)} aria-label={t.side} className={field}>
          {SIDES.map((s) => (
            <option key={s} value={s}>
              {t[`side_${s}`]}
            </option>
          ))}
        </select>
        <input
          ref={groupRef}
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            groupSuggest.typed(e.target.value);
          }}
          onFocus={groupSuggest.showAll}
          onBlur={(e) => {
            if (!groupSuggest.inside(e.relatedTarget)) groupSuggest.close();
          }}
          onKeyDown={(e) => {
            const picked = groupSuggest.key(e);
            if (picked !== null) {
              e.preventDefault(); // pick the group, don't add the guest yet
              setGroup(picked);
              groupSuggest.close();
            }
          }}
          autoComplete="off"
          placeholder={t.group}
          aria-label={t.group}
          className={field}
        />
        <SuggestList
          anchor={groupRef.current}
          s={groupSuggest}
          current={group.trim()}
          onPick={(g) => {
            setGroup(g);
            groupSuggest.close();
          }}
          onRename={
            renameGroup &&
            (async (from, to) => {
              const saved = await renameGroup(from, to);
              if (saved && group.trim() === from) setGroup(saved);
              return saved;
            })
          }
          onRemove={
            removeGroup &&
            (async (g) => {
              await removeGroup(g);
              if (group.trim() === g) setGroup("");
            })
          }
          labels={t}
        />
        <input name="invitedCount" type="number" inputMode="numeric" min={1} defaultValue={1} aria-label={t.invitedCount} title={t.invitedCount} className={field} />
        <button
          type="submit"
          disabled={pending}
          className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 md:col-span-1"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {t.add}
        </button>
      </div>
      {note && <p className={`mt-2 text-xs ${note.ok ? "text-emerald-700" : "text-red-600"}`}>{note.text}</p>}
    </form>
  );
}

/* ───────────── delete ───────────── */

/**
 * Delete without a browser dialog: the first click turns the bin into a red "Delete?" button, a
 * second click deletes. Left alone for a few seconds, it goes back to the bin.
 */
export function DeleteGuestButton({ remove, t }: { remove: () => Promise<void>; t: GuestSheetDict }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={pending}
      title={armed ? t.clickAgainToDelete : t.delete}
      aria-label={armed ? t.clickAgainToDelete : t.delete}
      onClick={() => (armed ? start(() => remove()) : setArmed(true))}
      className={
        armed || pending
          ? "inline-flex h-8 items-center gap-1 rounded-full bg-red-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-70"
          : "inline-flex size-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      {(armed || pending) && <span>{t.delete}?</span>}
    </button>
  );
}

/* ───────────── editable rows ───────────── */

export function GuestSheetRow({
  g,
  save,
  t,
  edit,
  actions,
  groups,
  renameGroup,
  removeGroup,
}: {
  g: SheetGuest;
  save: (id: string, patch: GuestPatch) => Promise<SheetResult>;
  t: GuestSheetDict;
  edit: ReactNode;
  actions: ReactNode;
  /** the event's groups, offered when editing a group cell */
  groups: string[];
  renameGroup?: (from: string, to: string) => Promise<string>;
  removeGroup?: (group: string) => Promise<void>;
}) {
  const { saveField, pick } = useRowSave(save, g.id);
  return (
    <tr className="align-middle">
      <td className="py-1.5 pl-3 pr-1">
        <div className="flex items-center gap-2">
          <Avatar name={g.name} />
          <TextCell value={g.name} field="name" save={saveField} label={t.name} required className="font-medium text-stone-800" />
        </div>
      </td>
      <td className="px-1 py-1.5">
        <TextCell value={g.phone ?? ""} field="phone" save={saveField} label={t.phone} placeholder="—" type="tel" inputMode="tel" className="text-stone-600" />
      </td>
      <td className="px-1 py-1.5">
        <ChipSelect value={g.side} options={SIDES} labels={(s) => t[`side_${s}`]} chip={SIDE_CHIP} label={t.side} onPick={(side) => pick({ side })} />
      </td>
      <td className="px-1 py-1.5">
        <TextCell value={g.group ?? ""} field="group" save={saveField} label={t.group} placeholder="—" className="text-stone-600" options={groups} onRenameOption={renameGroup} onRemoveOption={removeGroup} toolLabels={t} />
      </td>
      <td className="w-20 px-1 py-1.5">
        <TextCell value={String(g.invitedCount)} field="invitedCount" save={saveField} label={t.invitedCount} type="number" inputMode="numeric" className="text-right font-medium" />
      </td>
      <td className="px-1 py-1.5">
        <ChipSelect value={g.status} options={STATUSES} labels={(s) => t[`status_${s}`]} chip={STATUS_CHIP} label={t.status} onPick={(status) => pick({ status })} />
      </td>
      <td className="py-1.5 pl-1 pr-3">
        <div className="flex items-center justify-end gap-1.5">
          {actions}
          {edit}
        </div>
      </td>
    </tr>
  );
}

export function GuestSheetCard({
  g,
  save,
  t,
  edit,
  actions,
  groups,
  renameGroup,
  removeGroup,
}: {
  g: SheetGuest;
  save: (id: string, patch: GuestPatch) => Promise<SheetResult>;
  t: GuestSheetDict;
  edit: ReactNode;
  actions: ReactNode;
  /** the event's groups, offered when editing a group cell */
  groups: string[];
  renameGroup?: (from: string, to: string) => Promise<string>;
  removeGroup?: (group: string) => Promise<void>;
}) {
  const { saveField, pick } = useRowSave(save, g.id);
  return (
    <li className="space-y-2 rounded-2xl border border-stone-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <Avatar name={g.name} className="size-9 shrink-0 text-sm" />
        <TextCell value={g.name} field="name" save={saveField} label={t.name} required className="font-medium text-stone-800" />
        <div className="shrink-0">{edit}</div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
        <TextCell value={g.phone ?? ""} field="phone" save={saveField} label={t.phone} placeholder={t.phone} type="tel" inputMode="tel" className="text-stone-600" />
        <div className="flex items-center gap-1">
          <Users className="size-3.5 shrink-0 text-stone-400" />
          <TextCell value={String(g.invitedCount)} field="invitedCount" save={saveField} label={t.invitedCount} type="number" inputMode="numeric" className="text-right" />
        </div>
      </div>
      <TextCell value={g.group ?? ""} field="group" save={saveField} label={t.group} placeholder={t.group} className="text-stone-600" options={groups} onRenameOption={renameGroup} onRemoveOption={removeGroup} toolLabels={t} />
      <div className="flex flex-wrap items-center gap-1.5">
        <ChipSelect value={g.side} options={SIDES} labels={(s) => t[`side_${s}`]} chip={SIDE_CHIP} label={t.side} onPick={(side) => pick({ side })} />
        <ChipSelect value={g.status} options={STATUSES} labels={(s) => t[`status_${s}`]} chip={STATUS_CHIP} label={t.status} onPick={(status) => pick({ status })} />
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </div>
      {g.notes && <p className="px-2 text-xs text-stone-500">{g.notes}</p>}
    </li>
  );
}
