"use client";

import { useActionState, useEffect, useRef } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import type { ImportState } from "@/actions/guests";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, ErrorText } from "@/components/ui";
import type { Dict } from "@/lib/i18n";

export function ImportForm({
  action,
  t,
  templateHref,
  help,
  children,
}: {
  action: (state: ImportState, fd: FormData) => Promise<ImportState>;
  t: Dict;
  templateHref: string;
  /** replaces the guest-list help text */
  help?: string;
  /** extra options under the file box */
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.message) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <p className="text-sm text-stone-600">{help ?? t.importHelp}</p>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-6 text-center text-sm text-stone-600 transition hover:bg-brand-50">
        <FileSpreadsheet className="size-8 text-brand-400" />
        <input
          name="file"
          type="file"
          required
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="max-w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-brand-700 file:shadow-sm"
        />
      </label>
      {children}
      <ErrorText>{state?.error}</ErrorText>
      {state?.message && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{state.message}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={templateHref} className="text-sm font-medium text-brand-600 hover:underline">
          {t.downloadTemplate}
        </a>
        <SubmitButton className={btnPrimary}>
          <Upload className="size-4" />
          {t.import}
        </SubmitButton>
      </div>
    </form>
  );
}
