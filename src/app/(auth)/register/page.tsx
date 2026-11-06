import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { AuthForm } from "@/components/AuthForm";
import { SocialLogin } from "@/components/SocialLogin";

export default async function RegisterPage() {
  const { t } = await getDict();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-700">{t.register}</h1>
        <p className="mt-1 text-sm text-stone-500">{t.registerSubtitle}</p>
      </div>
      <AuthForm mode="register" t={t} />
      <SocialLogin t={t} />
      <p className="text-center text-sm text-stone-600">
        {t.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-brand-600 underline-offset-4 hover:underline">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
