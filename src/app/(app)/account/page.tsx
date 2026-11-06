import { Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/social-auth";
import { getDict } from "@/lib/i18n";
import { PasswordForm, ProfileForm } from "@/components/AccountForms";
import { Avatar } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getDict();
  return { title: `${t.myAccount} · ${t.appName}` };
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ linked?: string; error?: string }> }) {
  const sp = await searchParams;
  const { id } = await requireUser();
  const { t, lang } = await getDict();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { name: true, email: true, phone: true, createdAt: true, passwordHash: true, googleId: true, telegramId: true },
  });
  const linked = [user.googleId && "Google", user.telegramId && "Telegram"].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} className="size-12 text-base" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{t.myAccount}</h1>
          <p className="text-xs text-stone-500">
            {t.memberSince}{" "}
            {new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { dateStyle: "long", timeZone: "Asia/Phnom_Penh" }).format(user.createdAt)}
          </p>
          {linked.length > 0 && (
            <p className="text-xs text-stone-500">
              {t.linkedAccounts}: <span className="font-medium text-brand-700">{linked.join(" · ")}</span>
            </p>
          )}
        </div>
      </div>
      {/* Google: link it here (signed in) — Google sign-in no longer joins a password account by itself */}
      {sp.linked === "google" && <p className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{t.googleLinked}</p>}
      {sp.error?.startsWith("google") && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{sp.error === "google_taken" ? t.errGoogleTaken : t.errGoogleLogin}</p>
      )}
      {googleEnabled() && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white/80 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800">Google</p>
            <p className="text-xs text-stone-500">{user.googleId ? t.googleLinkedHint : t.linkGoogleHint}</p>
          </div>
          {user.googleId ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <Check className="size-4" />
              {t.googleIsLinked}
            </span>
          ) : (
            <a href="/api/auth/google?link=1" className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 transition hover:border-brand-300 hover:bg-brand-50">
              {t.linkGoogle}
            </a>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone }} t={t} />
        <PasswordForm t={t} hasPassword={Boolean(user.passwordHash)} />
      </div>
    </div>
  );
}
