"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Banknote, Check, CircleEllipsis, Plus, QrCode } from "lucide-react";
import type { GiftMethod } from "@prisma/client";
import type { FormState } from "@/actions/auth";
import { useCloseModal } from "@/components/Modal";
import { GuestPicker, type PickGuest } from "@/components/GuestPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, ErrorText, Field, inputCls } from "@/components/ui";
import { GIFT_SIDES, type GiftRow } from "@/lib/gifts";
import type { GiftFormsDict } from "@/lib/ui-keys";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/** A group title like Field's, for pill groups (Field is a <label>, which can't hold several radios) */
const GroupLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-sm font-medium text-stone-700">
    {children}
    <span className="text-brand-600"> *</span>
  </span>
);

/** One pill of a radio group: outlined card, gold when chosen */
function Pill({ children, ...radio }: React.InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className="group flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 transition hover:border-brand-200 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100">
      <input type="radio" className="sr-only" {...radio} />
      {children}
    </label>
  );
}

const METHOD_PILL: Record<GiftMethod, { icon: typeof Banknote; label: (t: GiftFormsDict) => string }> = {
  CASH: { icon: Banknote, label: (t) => t.method_CASH },
  BANK: { icon: QrCode, label: (t) => t.method_BANK },
  OTHER: { icon: CircleEllipsis, label: (t) => t.method_OTHER },
};

/**
 * Add (inline on the page, stays open for the next envelope) or edit (inside a pop-up).
 * Names on the guest list are suggested; a matching name links the gift to that guest on save.
 */
export function GiftForm({
  action,
  t,
  gift,
  guests,
  given,
}: {
  action: Action;
  t: GiftFormsDict;
  gift?: GiftRow;
  /** the event's guest list, offered in the name field */
  guests: PickGuest[];
  /** ids of guests who already have a gift recorded */
  given: string[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const closeModal = useCloseModal();
  const sideRef = useRef<HTMLSelectElement>(null);
  const [name, setName] = useState(gift?.name ?? "");
  const givenSet = useMemo(() => new Set(given.filter((id) => id !== gift?.guestId)), [given, gift?.guestId]);
  // controlled, so the chosen currency stays for the next envelope after the form resets
  const [currency, setCurrency] = useState(gift?.currency ?? "USD");
  // "Other" only for gifts that already use it (imports); new gifts are Cash or KHQR
  const methods: GiftMethod[] = gift?.method === "OTHER" ? ["CASH", "BANK", "OTHER"] : ["CASH", "BANK"];

  const currencyRef = useRef(currency);
  currencyRef.current = currency;

  useEffect(() => {
    if (!state || state.error) return;
    if (gift) return closeModal();
    const form = formRef.current;
    form?.reset();
    // reset() puts the radios back to their first-render state; re-tick the currency still in use
    const keep = form?.querySelector<HTMLInputElement>(`input[name=currency][value=${currencyRef.current}]`);
    if (keep) keep.checked = true;
    setName("");
    nameRef.current?.focus();
  }, [state, gift, closeModal]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4">
      {/* a div, not Field's <label>: the drop-down holds its own buttons */}
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <GroupLabel>{t.giftFrom}</GroupLabel>
        <GuestPicker
          guests={guests}
          given={givenSet}
          value={name}
          onChange={setName}
          onPick={(g) => {
            if (sideRef.current) sideRef.current.value = g.side;
          }}
          t={t}
          inputRef={nameRef}
        />
      </div>
      <Field label={t.giftAmount} required className="col-span-2 sm:col-span-1">
        <span className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-brand-600">{currency === "KHR" ? "៛" : "$"}</span>
          <input name="amount" required inputMode="decimal" defaultValue={gift?.amount ?? ""} placeholder={currency === "KHR" ? "100,000" : "50"} className={`${inputCls} pl-9`} />
        </span>
      </Field>

      <div role="radiogroup" aria-label={t.giftPayType} className="col-span-2 space-y-1.5 sm:col-span-1">
        <GroupLabel>{t.giftPayType}</GroupLabel>
        <div className={`grid gap-2 ${methods.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {methods.map((m) => {
            const { icon: Icon, label } = METHOD_PILL[m];
            return (
              <Pill key={m} name="method" value={m} defaultChecked={(gift?.method ?? "CASH") === m}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition group-has-[:checked]:bg-white group-has-[:checked]:text-brand-600 group-has-[:checked]:shadow-sm">
                  <Icon className="size-[18px]" />
                </span>
                <span className="truncate">{label(t)}</span>
              </Pill>
            );
          })}
        </div>
      </div>

      <div role="radiogroup" aria-label={t.giftCurrencyType} className="col-span-2 space-y-1.5 sm:col-span-1">
        <GroupLabel>{t.giftCurrencyType}</GroupLabel>
        <div className="grid grid-cols-2 gap-2">
          {(["USD", "KHR"] as const).map((c) => (
            <Pill key={c} name="currency" value={c} checked={currency === c} onChange={() => setCurrency(c)}>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 text-white transition group-has-[:checked]:border-brand-500 group-has-[:checked]:bg-brand-500">
                <Check className="size-3 opacity-0 group-has-[:checked]:opacity-100" strokeWidth={3.5} />
              </span>
              <span className="truncate">{c === "USD" ? t.currencyDollar : t.currencyRiel}</span>
            </Pill>
          ))}
        </div>
      </div>

      <Field label={t.side} className="col-span-2 sm:col-span-1">
        <select ref={sideRef} name="side" defaultValue={gift?.side ?? ""} className={inputCls}>
          {!gift && <option value="">{t.giftSideAuto}</option>}
          {GIFT_SIDES.map((s) => (
            <option key={s} value={s}>
              {t[`side_${s}`]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.notes} className="col-span-2 sm:col-span-1">
        <input name="notes" maxLength={500} defaultValue={gift?.notes ?? ""} className={inputCls} />
      </Field>
      {state?.error && (
        <div className="col-span-2">
          <ErrorText>{state.error}</ErrorText>
        </div>
      )}
      <div className="col-span-2 flex flex-wrap items-center justify-end gap-3">
        {!gift && state && !state.error && <p className="mr-auto text-sm text-emerald-700">{t.giftSaved}</p>}
        <SubmitButton className={btnPrimary}>
          {gift ? <Check className="size-4" /> : <Plus className="size-4" />}
          {gift ? t.save : t.addGift}
        </SubmitButton>
      </div>
    </form>
  );
}
