"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { FormState } from "@/actions/auth";
import { useCloseModal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, ErrorText, Field, inputCls } from "@/components/ui";
import { CATEGORY_STYLE, CURRENCIES, EXPENSE_CATEGORIES, formatMoney } from "@/lib/expenses";
import type { ExpenseFormsDict } from "@/lib/ui-keys";

/** Plain (serialisable) expense for the edit form */
export type ExpenseRow = {
  id: string;
  title: string;
  group: string | null;
  category: (typeof EXPENSE_CATEGORIES)[number];
  vendor: string | null;
  quantity: number;
  unitPrice: number | null;
  amount: number;
  paid: number;
  dueDate: string | null; // yyyy-mm-dd
  notes: string | null;
};

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

export function ExpenseForm({
  action,
  t,
  expense,
  currency,
  groups,
  defaultGroup,
}: {
  action: Action;
  t: ExpenseFormsDict;
  expense?: ExpenseRow;
  currency: string;
  /** existing group names, suggested in the Group field */
  groups: string[];
  /** new expense added from a group's "+" button */
  defaultGroup?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const listId = useId();
  // older rows (and imported totals) may have no unit price: start from the total
  const [qty, setQty] = useState(String(expense?.quantity ?? 1));
  const [price, setPrice] = useState(
    expense ? String(expense.unitPrice ?? (expense.quantity ? expense.amount / expense.quantity : expense.amount)) : "",
  );
  const n = (v: string) => Number(v.replace(/[,\s]/g, "")) || 0;
  const lineTotal = n(qty) * n(price);
  const formRef = useRef<HTMLFormElement>(null);
  const closeModal = useCloseModal();

  // Saved: close the pop-up (and clear the add form for the next one)
  useEffect(() => {
    if (state && !state.error) {
      if (!expense) {
        formRef.current?.reset();
        setQty("1");
        setPrice("");
      }
      closeModal();
    }
  }, [state, expense, closeModal]);

  const unit = currency === "KHR" ? "៛" : "$";
  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label={t.expenseTitle} required className="sm:col-span-2">
        <input name="title" required maxLength={120} defaultValue={expense?.title} placeholder={t.expenseTitlePlaceholder} className={inputCls} />
      </Field>
      <Field label={t.expenseGroup}>
        <input name="group" maxLength={60} list={listId} defaultValue={expense?.group ?? defaultGroup ?? ""} placeholder={t.expenseGroupPlaceholder} className={inputCls} />
        <datalist id={listId}>
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </Field>
      <Field label={t.expenseCategory}>
        <select name="category" defaultValue={expense?.category ?? "VENUE"} className={inputCls}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_STYLE[c].emoji} {t[`cat_${c}`]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.expenseVendor}>
        <input name="vendor" maxLength={120} defaultValue={expense?.vendor ?? ""} placeholder={t.expenseVendorPlaceholder} className={inputCls} />
      </Field>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
        <Field label={t.expenseQuantity}>
          <input name="quantity" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
        </Field>
        <Field label={`${t.expenseUnitPrice} (${unit})`} required>
          <input name="unitPrice" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
      </div>
      <div className="flex items-end">
        <p className="w-full rounded-full bg-brand-50 px-4 py-2 text-sm text-stone-600">
          {t.expenseAmount}: <b className="text-brand-700">{formatMoney(lineTotal, currency)}</b>
        </p>
      </div>
      <Field label={`${t.expensePaid} (${unit})`} hint={t.expensePaidHint}>
        <input name="paid" inputMode="decimal" defaultValue={expense?.paid || ""} placeholder="0" className={inputCls} />
      </Field>
      <Field label={t.expenseDue}>
        <input name="dueDate" type="date" defaultValue={expense?.dueDate ?? ""} className={inputCls} />
      </Field>
      <Field label={t.notes}>
        <input name="notes" maxLength={1000} defaultValue={expense?.notes ?? ""} className={inputCls} />
      </Field>
      {state?.error && (
        <div className="sm:col-span-2">
          <ErrorText>{state.error}</ErrorText>
        </div>
      )}
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton className={btnPrimary}>
          {expense ? <Check className="size-4" /> : <Plus className="size-4" />}
          {expense ? t.save : t.add}
        </SubmitButton>
      </div>
    </form>
  );
}

/** Budget + currency, saved together */
export function BudgetForm({ action, t, budget, currency }: { action: Action; t: ExpenseFormsDict; budget: number | null; currency: string }) {
  const [state, formAction] = useActionState(action, undefined);
  const closeModal = useCloseModal();
  useEffect(() => {
    if (state && !state.error) closeModal();
  }, [state, closeModal]);
  return (
    <form action={formAction} className="space-y-4">
      <Field label={t.expenseCurrency} hint={t.currencyHint}>
        <select name="currency" defaultValue={currency} className={inputCls}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {t[`currency_${c}`]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.budget} hint={t.budgetHint}>
        <input name="budget" inputMode="decimal" defaultValue={budget ?? ""} placeholder="0" className={inputCls} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton className={btnPrimary}>
          <Check className="size-4" />
          {t.save}
        </SubmitButton>
      </div>
    </form>
  );
}
