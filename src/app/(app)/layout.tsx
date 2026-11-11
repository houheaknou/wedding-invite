import Link from "next/link";
import { CalendarHeart, LogOut, UserRound } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { logout } from "@/features/auth/actions";
import { Dropdown } from "@/components/Dropdown";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { FloatingDecor } from "@/components/FloatingDecor";
import { Avatar } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { t, lang } = await getDict();
  return (
    <div className="relative isolate min-h-screen">
      <FloatingDecor />
      <header className="sticky top-0 z-30 border-b border-brand-100/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <Logo name={t.appName} href="/events" />
          <Link
            href="/events"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-brand-700 hover:bg-brand-50"
          >
            <CalendarHeart className="size-4" />
            <span className="hidden sm:inline">{t.events}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LangSwitch current={lang} />
            <Dropdown
              summaryClassName="block rounded-full ring-brand-200 transition hover:ring-4"
              summary={<Avatar name={user.name} className="size-8 text-xs" />}
            >
              <div className="w-52">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-stone-500">{user.email ?? user.phone}</p>
                </div>
                <Link
                  href="/account"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  <UserRound className="size-4" />
                  {t.myAccount}
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <LogOut className="size-4" />
                    {t.logout}
                  </button>
                </form>
              </div>
            </Dropdown>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6">{children}</main>
    </div>
  );
}
