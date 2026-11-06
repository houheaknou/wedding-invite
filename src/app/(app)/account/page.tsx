import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { PasswordForm, ProfileForm } from "@/components/AccountForms";
import { Avatar } from "@/components/ui";

export async function generateMetadata() {
  const { t } = await getDict();
  return { title: `${t.myAccount} · ${t.appName}` };
}

export default async function AccountPage() {
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
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone }} t={t} />
        <PasswordForm t={t} hasPassword={Boolean(user.passwordHash)} />
      </div>
    </div>
  );
}
