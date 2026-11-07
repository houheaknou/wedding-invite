"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputCls } from "@/components/ui";

/** Password field with an eye button to show/hide what was typed; optional leading icon. */
export function PasswordInput({
  showLabel,
  hideLabel,
  icon,
  inputClassName,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  showLabel: string;
  hideLabel: string;
  /** leading icon, drawn by the caller (e.g. inside a badge) */
  icon?: ReactNode;
  /** replaces the default input style */
  inputClassName?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      {icon && <span className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center">{icon}</span>}
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${inputClassName ?? inputCls} pr-11 ${icon && !inputClassName ? "pl-10" : ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        title={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute inset-y-0 right-1.5 my-auto inline-flex size-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-brand-50 hover:text-brand-700"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
