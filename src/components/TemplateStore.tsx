"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Pencil, Sparkles, Users } from "lucide-react";
import { InvitationView } from "@/components/InvitationView";
import { Modal } from "@/components/Modal";
import type { Dict } from "@/lib/i18n";
import { TEMPLATES, type InvitationData, type TemplateId } from "@/lib/invitation";

/**
 * Template gallery ("Add template" tab): a card per template with a live mini preview of this event.
 * Every template is free for now — paid templates need the payment system on the roadmap.
 */
export function TemplateStore({
  t,
  data,
  current,
  editHref,
  choose,
}: {
  t: Dict;
  data: InvitationData;
  current: TemplateId;
  editHref: string;
  choose: (templateId: string) => Promise<void>;
}) {
  const [active, setActive] = useState(current);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const lang = data.lang;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-bold">{t.storeTitle}</h1>
        <span className="text-sm text-stone-500">{TEMPLATES.length}</span>
        <p className="w-full text-sm text-stone-500">{t.storeHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TEMPLATES.map((tpl) => {
          const preview: InvitationData = { ...data, template: tpl.id, ...(tpl.id === data.template ? {} : tpl.colors) };
          const inUse = active === tpl.id;
          return (
            <article
              key={tpl.id}
              className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                inUse ? "border-brand-300 ring-2 ring-brand-100" : "border-stone-200"
              }`}
            >
              {/* live mini preview */}
              <div className="relative h-[300px] overflow-hidden bg-stone-100">
                <div className="pointer-events-none absolute left-1/2 top-0 w-[375px] origin-top -translate-x-1/2 scale-[0.6]" aria-hidden>
                  <InvitationView data={preview} heroClassName="min-h-[500px]" idPrefix={`s-${tpl.id}-`} thumbnail />
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-brand-700 shadow-sm">
                  Wedding
                </span>
                <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                  {t.storeFree}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="font-semibold text-stone-800">{tpl.name[lang]}</p>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
                  <Users className="size-3" />
                  {t.storeGuests}
                </span>
                <div className="mt-auto flex items-center gap-1.5 border-t border-stone-100 pt-2 text-sm font-semibold text-emerald-700">
                  <Check className="size-4" />
                  {t.storeFree}
                </div>
                <div className="flex items-center gap-2">
                  {inUse ? (
                    <Link
                      href={editHref}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700"
                    >
                      <Pencil className="size-3.5" />
                      {t.storeInUse} · {t.storeEdit}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          setBusy(tpl.id);
                          await choose(tpl.id);
                          setActive(tpl.id);
                          setBusy(null);
                        })
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      <Sparkles className="size-3.5" />
                      {busy === tpl.id ? "…" : t.storeUse}
                    </button>
                  )}
                  <Modal
                    title={tpl.name[lang]}
                    closeLabel={t.close}
                    triggerClassName="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                    trigger={
                      <>
                        <Eye className="size-3.5" />
                        {t.storeView}
                      </>
                    }
                  >
                    <div className="flex justify-center">
                      <div className="w-full max-w-[380px] rounded-[2.4rem] border-[9px] border-stone-900 bg-stone-900">
                        <div className="h-[70vh] max-h-[680px] overflow-y-auto overflow-x-hidden rounded-[1.8rem] [scrollbar-width:thin]">
                          <InvitationView data={preview} heroClassName="min-h-[620px]" idPrefix={`m-${tpl.id}-`} />
                        </div>
                      </div>
                    </div>
                  </Modal>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
