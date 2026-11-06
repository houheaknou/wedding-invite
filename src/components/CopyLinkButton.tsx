"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { btnIcon } from "@/components/ui";
import { publicUrl } from "@/lib/public-url";

/** Copies an app-relative path as an absolute URL. */
export function CopyLinkButton({ path, label }: { path: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(publicUrl(path));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className={`${btnIcon} ${done ? "border-emerald-200 text-emerald-600" : ""}`}
    >
      {done ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
    </button>
  );
}
