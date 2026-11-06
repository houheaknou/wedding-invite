"use client";

import { useRouter } from "next/navigation";

/**
 * A table row / list item that opens `href` when clicked anywhere — except on its own buttons,
 * links and form controls, which keep doing their job. Keyboard users get the real link inside
 * the row (e.g. the name), so this is only a mouse/touch shortcut.
 */
export function ClickableRow({
  href,
  as: Tag = "tr",
  className = "",
  children,
}: {
  href: string;
  as?: "tr" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Tag
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label, form, dialog")) return;
        if (window.getSelection()?.toString()) return; // selecting text (e.g. copying a phone number)
        router.push(href);
      }}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </Tag>
  );
}
