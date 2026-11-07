import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarHeart, FileSpreadsheet, Users } from "lucide-react";
import { getCurrentUser } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { FloatingDecor } from "@/components/FloatingDecor";
import { btnPrimary, btnSecondary } from "@/components/ui";

export default async function Home() {
  if (await getCurrentUser()) redirect("/events");
  const { t, lang } = await getDict();
  const features = [
    { icon: CalendarHeart, label: t.myEvents },
    { icon: Users, label: t.guestList },
    { icon: FileSpreadsheet, label: t.importExport },
  ];
  return (
    <main className="relative isolate mx-auto flex min-h-screen max-w-4xl flex-col px-4">
      <FloatingDecor />
      <div className="flex items-center justify-between py-4">
        <Logo name={t.appName} />
        <LangSwitch current={lang} />
      </div>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 pb-20 text-center">
        <div className="relative">
          <div className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 via-white to-brand-200 text-6xl shadow-inner">
            💍
          </div>
          <span className="absolute -right-3 top-0 animate-bounce text-2xl">💕</span>
          <span className="absolute -left-4 bottom-1 text-xl">🌸</span>
        </div>
        <h1 className="text-4xl font-bold text-brand-600 sm:text-5xl">{t.appName}</h1>
        <p className="max-w-md text-lg text-stone-600">{t.tagline}</p>
        <div className="flex gap-3">
          <Link href="/register" className={btnPrimary}>
            {t.getStarted}
          </Link>
          <Link href="/login" className={btnSecondary}>
            {t.login}
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {features.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white px-3 py-1 text-sm text-stone-600"
            >
              <Icon className="size-4 text-brand-500" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
