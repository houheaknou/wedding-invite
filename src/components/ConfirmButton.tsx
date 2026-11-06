"use client";

import { btnDanger } from "@/components/ui";

/** A one-button form that asks for confirmation before running a server action. */
export function ConfirmButton({
  action,
  confirm,
  children,
  className = btnDanger,
}: {
  action: () => Promise<void>;
  confirm: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
