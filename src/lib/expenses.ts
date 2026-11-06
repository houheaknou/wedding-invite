// Shared by the Expenses page (server), its forms (client) and the server actions.
import type { ExpenseCategory } from "@prisma/client";

export const CURRENCIES = ["USD", "KHR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "VENUE",
  "FOOD",
  "DECOR",
  "ATTIRE",
  "PHOTO",
  "MUSIC",
  "INVITATION",
  "CEREMONY",
  "TRANSPORT",
  "OTHER",
];

/** Emoji + bar colour per category (bars in the breakdown, dots in the list) */
export const CATEGORY_STYLE: Record<ExpenseCategory, { emoji: string; bar: string }> = {
  VENUE: { emoji: "🏛️", bar: "bg-amber-400" },
  FOOD: { emoji: "🍽️", bar: "bg-orange-400" },
  DECOR: { emoji: "💐", bar: "bg-rose-400" },
  ATTIRE: { emoji: "👗", bar: "bg-pink-400" },
  PHOTO: { emoji: "📸", bar: "bg-sky-400" },
  MUSIC: { emoji: "🎶", bar: "bg-violet-400" },
  INVITATION: { emoji: "💌", bar: "bg-red-300" },
  CEREMONY: { emoji: "🪷", bar: "bg-emerald-400" },
  TRANSPORT: { emoji: "🚗", bar: "bg-teal-400" },
  OTHER: { emoji: "✨", bar: "bg-stone-400" },
};

/** $1,250.50 / 5,000,000 ៛ — riel has no cents */
export function formatMoney(n: number, currency: string) {
  if (currency === "KHR") return `${Math.round(n).toLocaleString("en-US")} ៛`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export type PayStatus = "UNPAID" | "PARTIAL" | "PAID";
export const payStatus = (amount: number, paid: number): PayStatus =>
  paid <= 0 ? "UNPAID" : paid >= amount ? "PAID" : "PARTIAL";

export const PAY_CHIP: Record<PayStatus, string> = {
  UNPAID: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  PARTIAL: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
};
