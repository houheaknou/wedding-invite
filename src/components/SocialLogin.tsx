import { Heart } from "lucide-react";
import { appOrigin, googleEnabled, telegramBot, telegramBotId } from "@/lib/social-auth";
import type { Dict } from "@/lib/i18n";
import { TelegramButton } from "@/components/TelegramWidget";

const socialBtn =
  "group flex min-w-0 items-center justify-center gap-2.5 rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-60";

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const TelegramLogo = () => (
  <svg viewBox="0 0 24 24" className="size-[15px] -translate-x-px fill-white" aria-hidden>
    <path d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1.1-1 .2-1.5L20.6 2.7c.9-.3 1.6.2 1.3 1.6z" />
  </svg>
);

/** "Continue with Google / Telegram" — only the providers configured in .env are shown. */
export async function SocialLogin({ t, error }: { t: Dict; error?: string }) {
  const google = googleEnabled();
  const bot = telegramBot();
  const botId = telegramBotId();
  const origin = await appOrigin();
  // Telegram's login popup only works on the domain set with @BotFather /setdomain, so on localhost
  // or a LAN IP show a short note instead of a button that would fail.
  const localHost = /^https?:\/\/(localhost|127\.|\[::1\]|\d+\.\d+\.\d+\.\d+)/.test(origin);
  const telegram = Boolean(bot && botId && !localHost);
  const failed =
    error === "google" ? t.errGoogleLogin : error === "google_link" ? t.errGoogleLink : error === "telegram" ? t.errTelegramLogin : null;
  if (!google && !bot) return failed ? <p className="text-center text-xs text-red-600">{failed}</p> : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-stone-400">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-brand-200" />
        <Heart className="size-3 fill-rose-200 text-rose-200" />
        {t.orContinueWith}
        <Heart className="size-3 fill-rose-200 text-rose-200" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-brand-200" />
      </div>
      {failed && <p className="rounded-2xl bg-red-50 px-4 py-2 text-center text-sm text-red-700">{failed}</p>}

      <div className={`grid gap-2.5 ${google && telegram ? "grid-cols-2" : "grid-cols-1"}`}>
        {google && (
          // a plain link: the route sets the state cookie and redirects to Google
          <a
            href="/api/auth/google"
            aria-label={t.continueWithGoogle}
            className={`${socialBtn} border-stone-200 bg-white text-stone-700 hover:border-brand-200`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-stone-200">
              <GoogleLogo />
            </span>
            <span className="truncate">{google && telegram ? "Google" : t.continueWithGoogle}</span>
          </a>
        )}
        {telegram && (
          <TelegramButton
            botId={botId!}
            authUrl={`${origin}/api/auth/telegram`}
            className={`${socialBtn} border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#2AABEE] shadow-sm">
              <TelegramLogo />
            </span>
            <span className="truncate">{google ? "Telegram" : t.continueWithTelegram}</span>
          </TelegramButton>
        )}
      </div>
      {bot && localHost && <p className="text-center text-xs text-stone-400">{t.telegramPublicOnly}</p>}
    </div>
  );
}
