"use client";

import { publicUrl } from "@/lib/public-url";
import { TelegramIcon } from "@/components/TelegramIcon";
import { inviteShareMessage, type ShareMessageInput } from "@/features/invitation/share-message";

/**
 * Opens Telegram's share sheet with an invitation link (app-relative path) and the invitation
 * message (date, time, place, couple) with the link at the bottom.
 */
export function TelegramShareButton({
  path,
  message,
  label,
  compact = false,
}: {
  path: string;
  message: Omit<ShareMessageInput, "url">;
  label: string;
  compact?: boolean;
}) {
  function share() {
    const text = inviteShareMessage({ ...message, url: publicUrl(path) });
    // The whole message goes in `url` (no `text`): Telegram would otherwise put the link on top.
    // It still finds the link inside and shows the invitation's preview card.
    window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
