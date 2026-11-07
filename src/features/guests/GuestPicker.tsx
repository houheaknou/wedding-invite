"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { GuestSide } from "@prisma/client";
import { Check, ChevronDown, Phone, UserPlus, X } from "lucide-react";
import { Avatar, chip, inputCls } from "@/components/ui";
import { SIDE_CHIP } from "@/lib/constants";
import type { GuestPickerDict } from "@/lib/ui-keys";

export type PickGuest = { id: string; name: string; side: GuestSide; group: string | null; phone: string | null };

/**
 * Name field that drops down the event's guest list (filter by name or phone, ↑ ↓ Enter).
 * Any name can still be typed. Picking a guest calls onPick, so the form can take their side.
 */
export function GuestPicker({
  guests,
  given,
  value,
  onChange,
  onPick,
  t,
  inputRef,
}: {
  guests: PickGuest[];
  /** guests who already have a gift recorded */
  given: Set<string>;
  value: string;
  onChange: (name: string) => void;
  onPick: (guest: PickGuest) => void;
  t: GuestPickerDict;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  // filter only by what was typed since the last pick: reopening after a pick lists everyone again
  const [typed, setTyped] = useState(false);

  const exact = guests.find((g) => g.name.trim().toLowerCase() === value.trim().toLowerCase());
  const q = typed ? value.trim().toLowerCase() : "";
  const matches = useMemo(() => {
    const list = q ? guests.filter((g) => g.name.toLowerCase().includes(q) || g.phone?.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) : guests;
    // not-yet-given first, so the next envelope is easy to find
    return [...list].sort((a, b) => Number(given.has(a.id)) - Number(given.has(b.id))).slice(0, 50);
  }, [guests, given, q]);

  const pick = (g: PickGuest) => {
    onChange(g.name);
    onPick(g);
    setTyped(false);
    setOpen(false);
  };
  const openList = () => {
    if (!guests.length) return;
    clearTimeout(blurTimer.current);
    // start on the guest already chosen, so ↑ ↓ continue from there
    setActive(Math.max(0, matches.findIndex((g) => g.id === exact?.id)));
    setOpen(true);
  };
  const setRefs = (el: HTMLInputElement | null) => {
    fieldRef.current = el;
    if (typeof inputRef === "function") inputRef(el);
    else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };

  return (
    <div className="relative">
      <input
        ref={setRefs}
        name="name"
        required
        maxLength={120}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={guests.length ? t.giftPickGuest : t.giftFromPlaceholder}
        onChange={(e) => {
          onChange(e.target.value);
          setTyped(true);
          setOpen(true);
          setActive(0);
        }}
        onFocus={openList}
        onClick={openList}
        onBlur={() => (blurTimer.current = setTimeout(() => setOpen(false), 150))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) return openList();
          if (!open || !matches.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`${inputCls} ${exact ? "pl-11 font-medium text-stone-800" : ""} pr-16`}
      />
      {/* chosen guest: their initials inside the field */}
      {exact && (
        <span className="pointer-events-none absolute left-1.5 top-[21px] -translate-y-1/2">
          <Avatar name={exact.name} className="size-7 text-[10px]" />
        </span>
      )}
      <span className="absolute right-1.5 top-[21px] flex -translate-y-1/2 items-center">
        {value && (
          <button
            type="button"
            aria-label={t.clear}
            title={t.clear}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setTyped(false);
              fieldRef.current?.focus();
              openList();
            }}
            className="flex size-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={t.giftPickGuest}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) return setOpen(false);
            fieldRef.current?.focus();
            openList();
          }}
          className="flex size-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </span>

      {/* under the field: is this name on the guest list? */}
      {value.trim() && !open && (
        <p className="mt-1 flex items-center gap-1 px-1 text-xs">
          {exact ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="size-3.5" /> {t.giftOnGuestList} · {t[`side_${exact.side}`]}
              {given.has(exact.id) && <span className="text-amber-700">· {t.giftAlreadyGiven}</span>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-stone-500">
              <UserPlus className="size-3.5" /> {t.giftNotOnList}
            </span>
          )}
        </p>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          // keep focus in the field: otherwise its blur closes the list before the click lands
          onMouseDown={(e) => {
            e.preventDefault();
            clearTimeout(blurTimer.current);
          }}
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-brand-100 bg-white p-1.5 shadow-xl shadow-brand-900/10"
        >
          {matches.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-stone-500">
              <UserPlus className="size-4" />
              {t.giftNewName}
            </li>
          ) : (
            matches.map((g, i) => (
              <li key={g.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(g)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition ${i === active ? "bg-brand-50" : ""} ${g.id === exact?.id ? "ring-1 ring-brand-200" : ""}`}
                >
                  <Avatar name={g.name} className="size-8 text-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">{g.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-stone-500">
                      {g.group && <span className="truncate">{g.group}</span>}
                      {g.phone && (
                        <span className="inline-flex items-center gap-0.5">
                          <Phone className="size-3" />
                          {g.phone}
                        </span>
                      )}
                    </span>
                  </span>
                  {g.id === exact?.id ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  ) : given.has(g.id) ? (
                    <span className={`${chip} bg-amber-50 text-amber-700 ring-1 ring-amber-200`}>{t.giftAlreadyGiven}</span>
                  ) : (
                    <span className={`${chip} ${SIDE_CHIP[g.side]}`}>{t[`side_${g.side}`]}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
