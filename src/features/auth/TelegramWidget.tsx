"use client";

import { useEffect, useState, type ReactNode } from "react";

type TgUser = Record<string, string | number>;
declare global {
  interface Window {
    Telegram?: { Login: { auth: (opts: { bot_id: string; request_access?: string }, cb: (user: TgUser | false) => void) => void } };
  }
}

const SCRIPT = "https://telegram.org/js/telegram-widget.js?22";

/**
 * Our own styled button for Telegram Login. Telegram's ready-made button lives in an iframe we can't
 * restyle, so this loads the same official script and opens its login popup with Telegram.Login.auth.
 * The popup only works on the domain set with @BotFather → /setdomain. The signed user data it returns
 * is sent to `authUrl` (/api/auth/telegram), which checks the hash.
 */
export function TelegramButton({
  botId,
  authUrl,
  className,
  children,
}: {
  botId: string;
  authUrl: string;
  className: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.Telegram?.Login) return setReady(true);
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      document.head.appendChild(s);
    }
    const onLoad = () => setReady(true);
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);

  return (
    <button
      type="button"
      disabled={!ready}
      className={className}
      onClick={() =>
        window.Telegram?.Login.auth({ bot_id: botId, request_access: "write" }, (user) => {
          if (!user) return; // closed the popup / declined
          const qs = new URLSearchParams(Object.entries(user).map(([k, v]) => [k, String(v)]));
          window.location.href = `${authUrl}?${qs}`;
        })
      }
    >
      {children}
    </button>
  );
}
