import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-full border border-stone-200/70 bg-stone-100/70 px-4 py-2 text-sm outline-none transition placeholder:text-stone-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100";
export const textareaCls =
  "w-full rounded-2xl border border-stone-200/70 bg-stone-100/70 px-4 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60";
export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-200 hover:bg-brand-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50";
export const btnIcon =
  "inline-flex size-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700";
export const card = "rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-900/[0.03]";
export const chip = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function Field({
  label,
  required,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </span>
      {children}
      {hint && <span className="block px-1 text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-brand-50 px-4 py-2 text-sm text-brand-700">{children}</p>;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  // Khmer names: take the first grapheme of each part
  return letters.map((p) => Array.from(p)[0] ?? "").join("").toUpperCase();
}

export function Avatar({ name, className = "size-8 text-xs" }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
