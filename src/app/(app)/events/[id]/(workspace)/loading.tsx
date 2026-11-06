import { card } from "@/components/ui";

/**
 * Shown under the tab bar the moment a tab is clicked, while the next tab's page loads. Without it
 * the old page stays on screen with no feedback (slow over a phone connection), and Next.js can't
 * prefetch these dynamic pages. The tab bar itself (layout) stays and highlights the new tab at once.
 */
export default function WorkspaceLoading() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-44 rounded-full bg-brand-100/70" />
        <div className="h-9 w-24 rounded-full bg-brand-100/60" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} space-y-3`}>
            <div className="h-3 w-20 rounded-full bg-stone-200/70" />
            <div className="h-6 w-28 rounded-full bg-stone-200/80" />
          </div>
        ))}
      </div>
      <div className={`${card} space-y-3`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-9 shrink-0 rounded-full bg-stone-200/70" />
            <div className="h-4 flex-1 rounded-full bg-stone-200/60" />
            <div className="h-4 w-16 rounded-full bg-stone-200/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
