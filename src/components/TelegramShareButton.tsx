"use client";

import { publicUrl } from "@/lib/public-url";
import { TelegramIcon } from "@/components/TelegramIcon";

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
  const icon = <TelegramIcon size={compact ? 14 : 16} />;
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
