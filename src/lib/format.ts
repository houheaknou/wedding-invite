import type { Lang } from "@/lib/i18n";

// Events are entered and shown in Cambodia time (UTC+7, no DST).
export const EVENT_TZ = "Asia/Phnom_Penh";
const EVENT_OFFSET = "+07:00";

/** `<input type="datetime-local">` value ("2026-12-20T17:00") -> Date, or null. */
export function parseLocalDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00${EVENT_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date -> `<input type="datetime-local">` value in Cambodia time. */
export function toLocalInputValue(date: Date) {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function formatDateTime(date: Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: EVENT_TZ,
  }).format(date);
}

/** URL of an event's cover photo (cache-busted by updatedAt), or null. */
export function coverUrl(event: { id: string; coverImageType: string | null; updatedAt: Date }) {
  return event.coverImageType ? `/api/events/${event.id}/cover?v=${event.updatedAt.getTime()}` : null;
}

/** Whole days from today (Cambodia time) until the event day; negative once passed. */
export function daysUntil(date: Date) {
  const day = (d: Date) => Math.floor((d.getTime() + 7 * 60 * 60 * 1000) / 86_400_000);
  return day(date) - day(new Date());
}
