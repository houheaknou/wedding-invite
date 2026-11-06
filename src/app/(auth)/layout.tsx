import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { FloatingDecor } from "@/components/FloatingDecor";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/events");
  const { t, lang } = await getDict();
  return (
    <div className="relative isolate min-h-screen">
      <FloatingDecor />

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col px-4 pb-10">
        <div className="flex items-center justify-between py-4">
          <Logo name={t.appName} />
          <LangSwitch current={lang} />
        </div>

        <div className="relative mt-12 rounded-[2rem] border border-brand-200/80 bg-white/90 px-6 pb-7 pt-14 shadow-xl shadow-brand-900/10 backdrop-blur sm:px-8">
          {/* inner gold hairline frame */}
          <span aria-hidden className="pointer-events-none absolute inset-2 rounded-[1.6rem] border border-dashed border-brand-200" />
          {/* monogram badge */}
          <span className="absolute -top-10 left-1/2 flex size-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-b from-brand-50 to-brand-100 shadow-lg shadow-brand-900/15 ring-1 ring-brand-200">
            <Image src="/logo.png" alt="" width={30} height={52} className="h-12 w-auto drop-shadow-sm" priority />
          </span>
          <div className="relative">{children}</div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-stone-500">
          <span className="h-px w-8 bg-brand-200" />
          {t.tagline}
          <span className="h-px w-8 bg-brand-200" />
        </p>
      </main>
    </div>
  );
}
