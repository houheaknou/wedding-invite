"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PAGE_SIZES } from "@/lib/constants";

export function PageSizeSelect({ value, label }: { value: number; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-xs text-stone-500">
      <span className="hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("size", e.target.value);
          next.delete("page");
          router.replace(`${pathname}?${next}`, { scroll: false });
        }}
        className="h-8 rounded-full border border-stone-200 bg-white px-2 text-sm text-stone-700 outline-none focus:ring-4 focus:ring-brand-100"
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
