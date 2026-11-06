"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A <details> menu that closes on outside click, Escape, or choosing an item. */
export function Dropdown({
  summary,
  summaryClassName,
  children,
  className = "",
}: {
  summary: ReactNode;
  summaryClassName: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className={`relative ${className}`}>
      <summary className={`list-none cursor-pointer [&::-webkit-details-marker]:hidden ${summaryClassName}`}>{summary}</summary>
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) ref.current!.open = false;
        }}
        className="absolute right-0 z-20 mt-2 min-w-48 rounded-2xl border border-brand-100 bg-white p-1.5 shadow-lg shadow-brand-900/10"
      >
        {children}
      </div>
    </details>
  );
}
