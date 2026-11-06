"use client";

import { publicUrl } from "@/lib/public-url";

/** Opens Telegram's share sheet with an invitation link (app-relative path) and a message. */
export function TelegramShareButton({
  path,
  text,
  label,
  compact = false,
}: {
  path: string;
  text: string;
  label: string;
  compact?: boolean;
}) {
  function share() {
    const url = publicUrl(path);
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  const icon = (
    <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.5 3.5 2.8 10.8c-1 .4-1 1.6 0 1.9l4.7 1.5 1.8 5.6c.3.8 1.2 1 1.8.4l2.6-2.4 4.7 3.5c.7.5 1.6.1 1.8-.7l3-15.6c.2-1-.8-1.8-1.7-1.5zM9.6 14.3l-.4 3.6-1.3-4.1 9.7-6.4z" />
    </svg>
  );
  if (compact) {
    return (
      <button
        type="button"
        onClick={share}
        title={label}
        aria-label={label}
        className="inline-flex size-8 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 transition hover:bg-sky-50"
      >
        {icon}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#229ED9] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1c8cc2]"
    >
      {icon}
      {label}
    </button>
  );
}
