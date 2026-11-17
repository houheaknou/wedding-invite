"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
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
}) {
  const committed = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { flash, run } = useFlash();
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
  return (
    <input
      ref={inputRef}
      type={type}
      inputMode={inputMode}
      min={type === "number" ? 1 : undefined}
      defaultValue={value}
      aria-label={label}
      placeholder={placeholder}
      className={`${cellBase} ${flashCls[flash]} ${className}`}
      onBlur={(e) => void commit(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = committed.current;
          e.currentTarget.blur();
        }
      }}
    />
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
}: {
  add: (input: GuestPatch) => Promise<SheetResult>;
  groups: string[];
  t: GuestSheetDict;
  defaultSide?: GuestSide;
  defaultGroup?: string;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [side, setSide] = useState<GuestSide>(defaultSide ?? "BOTH");
  const [group, setGroup] = useState(defaultGroup);
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
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          list="guest-groups"
          autoComplete="off"
          placeholder={t.group}
          aria-label={t.group}
          className={field}
        />
        <datalist id="guest-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
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
}: {
  g: SheetGuest;
  save: (id: string, patch: GuestPatch) => Promise<SheetResult>;
  t: GuestSheetDict;
  edit: ReactNode;
  actions: ReactNode;
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
        <TextCell value={g.group ?? ""} field="group" save={saveField} label={t.group} placeholder="—" className="text-stone-600" />
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
}: {
  g: SheetGuest;
  save: (id: string, patch: GuestPatch) => Promise<SheetResult>;
  t: GuestSheetDict;
  edit: ReactNode;
  actions: ReactNode;
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
      <TextCell value={g.group ?? ""} field="group" save={saveField} label={t.group} placeholder={t.group} className="text-stone-600" />
      <div className="flex flex-wrap items-center gap-1.5">
        <ChipSelect value={g.side} options={SIDES} labels={(s) => t[`side_${s}`]} chip={SIDE_CHIP} label={t.side} onPick={(side) => pick({ side })} />
        <ChipSelect value={g.status} options={STATUSES} labels={(s) => t[`status_${s}`]} chip={STATUS_CHIP} label={t.status} onPick={(status) => pick({ status })} />
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </div>
      {g.notes && <p className="px-2 text-xs text-stone-500">{g.notes}</p>}
    </li>
  );
}
