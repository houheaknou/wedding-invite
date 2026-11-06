import { getDict } from "@/lib/i18n";
import { card } from "@/components/ui";

export async function ComingSoon({ emoji, title }: { emoji: string; title: string }) {
  const { t } = await getDict();
  return (
    <div className={`${card} flex flex-col items-center gap-3 py-16 text-center`}>
      <div className="relative">
        <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-5xl">
          {emoji}
        </div>
        <span className="absolute -right-2 -top-1 animate-bounce text-xl">✨</span>
      </div>
      <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">{t.comingSoon}</span>
      <p className="max-w-sm text-sm text-stone-500">{t.comingSoonText}</p>
    </div>
  );
}
