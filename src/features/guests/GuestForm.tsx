"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Plus } from "lucide-react";
import type { Guest } from "@prisma/client";
import type { FormState } from "@/features/auth/actions";
import { useCloseModal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, btnSecondary, ErrorText, Field, inputCls } from "@/components/ui";
import { SIDES, STATUSES } from "@/lib/constants";
import type { GuestFormDict } from "@/lib/ui-keys";

export function GuestForm({
  action,
  t,
  guest,
  cancelHref,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  t: GuestFormDict;
  guest?: Guest;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const closeModal = useCloseModal();

  // Adding (inside the modal): clear the form and close after each successful save
  useEffect(() => {
    if (!guest && state && !state.error) {
      formRef.current?.reset();
      closeModal();
    }
  }, [state, guest, closeModal]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label={t.name} required>
        <input name="name" required defaultValue={guest?.name} className={inputCls} />
      </Field>
      <Field label={t.phone}>
        <input name="phone" type="tel" defaultValue={guest?.phone ?? ""} className={inputCls} />
      </Field>
      <Field label={t.side}>
        <select name="side" defaultValue={guest?.side ?? "BOTH"} className={inputCls}>
          {SIDES.map((s) => (
            <option key={s} value={s}>
              {t[`side_${s}`]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.group}>
        <input name="group" placeholder={t.groupPlaceholder} defaultValue={guest?.group ?? ""} className={inputCls} />
      </Field>
      <Field label={t.invitedCount}>
        <input
          name="invitedCount"
          type="number"
          min={1}
          max={999}
          defaultValue={guest?.invitedCount ?? 1}
          className={inputCls}
        />
      </Field>
      <Field label={t.status}>
        <select name="status" defaultValue={guest?.status ?? "PENDING"} className={inputCls}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t[`status_${s}`]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.notes} className="sm:col-span-2">
        <input name="notes" defaultValue={guest?.notes ?? ""} className={inputCls} />
      </Field>
      {state?.error && (
        <div className="sm:col-span-2">
          <ErrorText>{state.error}</ErrorText>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-stone-100 pt-4 sm:col-span-2">
        {cancelHref && (
          <Link href={cancelHref} className={btnSecondary}>
            <ChevronLeft className="size-4" />
            {t.back}
          </Link>
        )}
        <SubmitButton className={btnPrimary}>
          {guest ? <Check className="size-4" /> : <Plus className="size-4" />}
          {guest ? t.save : t.addGuest}
        </SubmitButton>
      </div>
    </form>
  );
}
