"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "@/components/ui";

export function SubmitButton({ children, className = btnPrimary }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "…" : children}
    </button>
  );
}
