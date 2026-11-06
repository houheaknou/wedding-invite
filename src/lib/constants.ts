import type { EventType, GuestSide, GuestStatus } from "@prisma/client";

// Shared by server code and client components (no server-only imports here)
export const EVENT_TYPES: EventType[] = ["WEDDING", "ENGAGEMENT", "BIRTHDAY", "OTHER"];
export const SIDES: GuestSide[] = ["BRIDE", "GROOM", "BOTH"];
export const STATUSES: GuestStatus[] = ["PENDING", "INVITED", "CONFIRMED", "DECLINED"];
export const PAGE_SIZES = [10, 20, 50, 100];
export const GALLERY_MAX = 12;

export const STATUS_COLOR: Record<GuestStatus, string> = {
  CONFIRMED: "#10b981",
  INVITED: "#8b5cf6",
  PENDING: "#f59e0b",
  DECLINED: "#ef4444",
};

/** Tailwind classes for guest chips */
export const STATUS_CHIP: Record<GuestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  INVITED: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  DECLINED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};
export const SIDE_CHIP: Record<GuestSide, string> = {
  BRIDE: "bg-brand-600 text-white",
  GROOM: "bg-sky-600 text-white",
  BOTH: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
};
