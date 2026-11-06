// Shared by the Gifts page (server), its forms (client), the actions and the import/export.
import type { GiftMethod, GuestSide } from "@prisma/client";

export const GIFT_METHODS: GiftMethod[] = ["CASH", "BANK", "OTHER"];
export const GIFT_CURRENCIES = ["USD", "KHR"] as const;
export const GIFT_SIDES: GuestSide[] = ["BRIDE", "GROOM", "BOTH"];

export const METHOD_ICON: Record<GiftMethod, string> = { CASH: "💵", BANK: "📱", OTHER: "🎁" };

/** Plain (serialisable) gift for the list and the edit form */
export type GiftRow = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  side: GuestSide;
  method: GiftMethod;
  notes: string | null;
  guestId: string | null;
  createdAt: string; // ISO
};

/** Totals kept per currency: guests give dollars or riel, and the two are never added together */
export function giftTotals(gifts: { amount: number; currency: string }[]) {
  const usd = gifts.filter((g) => g.currency !== "KHR").reduce((s, g) => s + g.amount, 0);
  const khr = gifts.filter((g) => g.currency === "KHR").reduce((s, g) => s + g.amount, 0);
  return { usd, khr };
}
