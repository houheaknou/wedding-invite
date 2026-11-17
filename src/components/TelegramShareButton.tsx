"use client";

import { useEffect, useRef, useState } from "react";
import { publicUrl } from "@/lib/public-url";
import { TelegramIcon } from "@/components/TelegramIcon";
import { inviteShareMessage, KHMER_TERMS, type KhmerTerm, type ShareMessageInput } from "@/features/invitation/share-message";

/**
 * Opens Telegram's share sheet with an invitation link (app-relative path) and the invitation
 * message (date, time, place, couple) with the link at the bottom.
 *
 * With `askTerm` (a guest's Khmer invitation), the click first asks how to address the guest —
 * បង (older), ប្អូន (younger), លោក, អ្នកស្រី, លោកអ្នក — and remembers the choice for that guest.
 */
export function TelegramShareButton({
  path,
  message,
  label,
  askTerm,
  compact = false,
}: {
  path: string;
  message: Omit<ShareMessageInput, "url">;
  label: string;
  /** Heading of the form-of-address menu; no menu without it */
  askTerm?: string;
  compact?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [last, setLast] = useState<KhmerTerm | null>(null);
  const storeKey = `tg-term:${path}`;
  const withMenu = Boolean(askTerm && message.lang === "km" && message.guestName);

  function share(term?: KhmerTerm) {
    const text = inviteShareMessage({ ...message, term, url: publicUrl(path) });
    // The whole message goes in `url` (no `text`): Telegram would otherwise put the link on top.
    // It still finds the link inside and shows the invitation's preview card.
    window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function open() {
    if (!withMenu) return share();
    try {
      const saved = localStorage.getItem(storeKey) as KhmerTerm | null;
      setLast(saved && KHMER_TERMS.includes(saved) ? saved : null);
    } catch {
      setLast(null);
    }
    // fixed position: the guest table scrolls sideways and would clip a menu placed inside it
    const r = btnRef.current!.getBoundingClientRect();
    const width = 220;
    const below = r.bottom + 6 + 250 < window.innerHeight;
    setMenu({
      top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - 250),
      left: Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8),
    });
  }

  function pick(term: KhmerTerm) {
    try {
      localStorage.setItem(storeKey, term);
    } catch {
      // private mode: just don't remember it
    }
    setMenu(null);
    share(term);
  }

  // close on outside click, Escape, scroll or resize (the menu is pinned to the screen)
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node))) return;
      setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const icon = <TelegramIcon size={compact ? 14 : 16} />;
  const button = compact ? (
    <button
      ref={btnRef}
      type="button"
      onClick={() => (menu ? setMenu(null) : open())}
      title={label}
      aria-label={label}
      aria-haspopup={withMenu ? "menu" : undefined}
      aria-expanded={withMenu ? Boolean(menu) : undefined}
      className="inline-flex size-8 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 transition hover:bg-sky-50"
    >
      {icon}
    </button>
  ) : (
    <button
      ref={btnRef}
      type="button"
      onClick={() => (menu ? setMenu(null) : open())}
      aria-haspopup={withMenu ? "menu" : undefined}
      aria-expanded={withMenu ? Boolean(menu) : undefined}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#229ED9] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1c8cc2]"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      {button}
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menu.top, left: menu.left, width: 220 }}
          className="fixed z-50 rounded-2xl border border-sky-100 bg-white p-1.5 text-left shadow-xl"
        >
          <p className="px-2.5 pb-1 pt-0.5 text-xs text-stone-500">{askTerm}</p>
          {KHMER_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              role="menuitem"
              onClick={() => pick(term)}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-sm transition hover:bg-sky-50 hover:text-sky-700 ${
                term === last ? "bg-sky-50 font-semibold text-sky-700" : "text-stone-700"
              }`}
            >
              <span className="truncate">
                {term} {message.guestName}
              </span>
              {term === last && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
