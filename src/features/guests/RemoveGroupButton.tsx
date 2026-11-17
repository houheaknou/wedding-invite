"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

/**
 * The × on a group tab. First click turns it into a red "Delete?" chip, the second removes the group
 * from its guests (the guests stay). Left alone for a few seconds it goes back to ×. If the removed
 * group's tab was open, `leaveHref` goes back to the side's "all" tab.
 */
export function RemoveGroupButton({
  remove,
  leaveHref,
  active,
  t,
}: {
  remove: () => Promise<void>;
  leaveHref?: string;
  active: boolean;
  t: { delete: string; removeGroup: string; removeGroupConfirm: string };
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={pending}
      title={armed ? t.removeGroupConfirm : t.removeGroup}
      aria-label={armed ? t.removeGroupConfirm : t.removeGroup}
      onClick={() =>
        armed
          ? start(async () => {
              await remove();
              if (leaveHref) router.replace(leaveHref, { scroll: false });
            })
          : setArmed(true)
      }
      className={
        armed || pending
          ? "mr-0.5 inline-flex h-6 items-center gap-1 rounded-full bg-red-600 px-2 text-xs font-semibold text-white disabled:opacity-70"
          : `mr-0.5 inline-flex size-6 items-center justify-center rounded-full transition ${
              active ? "text-white/70 hover:bg-white/20 hover:text-white" : "text-stone-400 hover:bg-red-50 hover:text-red-600"
            }`
      }
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3.5" />}
      {(armed || pending) && <span>{t.delete}?</span>}
    </button>
  );
}
