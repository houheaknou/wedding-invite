"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { setLanguage } from "@/actions/auth";

const LABELS = { km: "ភាសាខ្មែរ", en: "English" } as const;

/** Globe pill that flips between Khmer and English. */
export function LangSwitch({ current }: { current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = current === "km" ? "en" : "km";
  return (
    <button
      type="button"
      disabled={pending}
      title={LABELS[next]}
      onClick={() =>
        startTransition(async () => {
          await setLanguage(next);
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 transition hover:border-brand-200 hover:bg-brand-50 disabled:opacity-60"
    >
      <Globe className="size-3.5" />
      {LABELS[current as keyof typeof LABELS] ?? LABELS.km}
    </button>
  );
}
