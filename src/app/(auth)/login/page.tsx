import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { AuthForm } from "@/components/AuthForm";
import { SocialLogin } from "@/components/SocialLogin";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { t } = await getDict();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-700">{t.login}</h1>
        <p className="mt-1 text-sm text-stone-500">{t.loginSubtitle}</p>
      </div>
      <AuthForm mode="login" t={t} />
      <SocialLogin t={t} error={error} />
      <p className="text-center text-sm text-stone-600">
        {t.noAccount}{" "}
        <Link href="/register" className="font-semibold text-brand-600 underline-offset-4 hover:underline">
          {t.register}
        </Link>
      </p>
    </div>
  );
}
