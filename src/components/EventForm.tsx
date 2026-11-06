"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ImageIcon, ListChecks, Upload, X } from "lucide-react";
import type { FormState } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, btnSecondary, ErrorText, Field, inputCls, textareaCls } from "@/components/ui";
import { EVENT_TYPES } from "@/lib/constants";
import type { Dict } from "@/lib/i18n";

export type EventDefaults = {
  title?: string | null;
  eventType?: string;
  groomName?: string;
  brideName?: string;
  date?: string;
  time?: string;
  venue?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  notes?: string | null;
  agenda?: string | null;
  coverUrl?: string | null;
};

export function EventForm({
  action,
  t,
  defaults = {},
  cancelHref,
  submitLabel,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  t: Dict;
  defaults?: EventDefaults;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(defaults.coverUrl ?? null);
  const [removed, setRemoved] = useState(false);

  // Free object URLs created for local previews
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setRemoved(false);
  }

  function onRemove() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
    setRemoved(true);
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Cover photo */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-stone-700">{t.coverPhoto}</span>
        <div className="relative aspect-[2/1] w-full max-w-md overflow-hidden rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: previews and auth-gated route
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-1 text-brand-400"
            >
              <ImageIcon className="size-10" strokeWidth={1.25} />
              <span className="text-2xl">💍</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className={btnSecondary}>
            <Upload className="size-4" />
            {t.uploadPhoto}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onRemove}
              title={t.removePhoto}
              aria-label={t.removePhoto}
              className="inline-flex size-9 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition hover:bg-brand-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          className="hidden"
        />
        {removed && <input type="hidden" name="removeCover" value="1" />}
      </div>

      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        <Field label={t.eventName}>
          <input name="title" placeholder={t.eventNamePlaceholder} defaultValue={defaults.title ?? ""} className={inputCls} />
        </Field>
        <Field label={t.eventType} required>
          <select name="eventType" defaultValue={defaults.eventType ?? "WEDDING"} className={inputCls}>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t[`eventType_${type}`]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.groomName} required>
          <input name="groomName" required placeholder={t.groomPlaceholder} defaultValue={defaults.groomName} className={inputCls} />
        </Field>
        <Field label={t.brideName} required>
          <input name="brideName" required placeholder={t.bridePlaceholder} defaultValue={defaults.brideName} className={inputCls} />
        </Field>
        <Field label={t.date} required>
          <input name="date" type="date" required defaultValue={defaults.date} className={inputCls} />
        </Field>
        <Field label={t.time} required>
          <input name="time" type="time" required defaultValue={defaults.time} className={inputCls} />
        </Field>
        <Field label={t.venue}>
          <textarea
            name="venue"
            rows={3}
            placeholder={t.venuePlaceholder}
            defaultValue={defaults.venue ?? ""}
            className={textareaCls}
          />
        </Field>
        <Field label={t.notes}>
          <textarea
            name="notes"
            rows={3}
            placeholder={t.notesPlaceholder}
            defaultValue={defaults.notes ?? ""}
            className={textareaCls}
          />
        </Field>
        <Field label={t.address}>
          <input name="address" defaultValue={defaults.address ?? ""} className={inputCls} />
        </Field>
        <Field label={t.mapLink}>
          <input
            name="mapUrl"
            type="url"
            placeholder="https://maps.app.goo.gl/…"
            defaultValue={defaults.mapUrl ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Agenda (collapsible) */}
      <details
        open={Boolean(defaults.agenda)}
        className="group rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-3 open:bg-white"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-stone-800 [&::-webkit-details-marker]:hidden">
          <CalendarDays className="size-5 text-brand-600" />
          {t.agenda}
          <ChevronDown className="ml-auto size-5 text-stone-500 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-1.5">
          <textarea
            name="agenda"
            rows={5}
            placeholder={"07:00 …\n09:00 …\n17:00 …"}
            defaultValue={defaults.agenda ?? ""}
            className={textareaCls}
          />
          <p className="flex items-center gap-1 px-1 text-xs text-stone-500">
            <ListChecks className="size-3.5" />
            {t.agendaHint}
          </p>
        </div>
      </details>

      <ErrorText>{state?.error}</ErrorText>

      <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4">
        <Link href={cancelHref} className={`${btnSecondary} w-full`}>
          <ChevronLeft className="size-4" />
          {t.back}
        </Link>
        <SubmitButton className={`${btnPrimary} w-full`}>
          <Check className="size-4" />
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
