import { requireOwnedEvent } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwnedEvent(id);
  const { t } = await getDict();
  const labels = {
    tabDashboard: t.tabDashboard,
    tabGuests: t.tabGuests,
    tabExpenses: t.tabExpenses,
    tabGifts: t.tabGifts,
    tabTemplate: t.tabTemplate,
    tabMore: t.tabMore,
  };
  return (
    <div className="space-y-5 rounded-[2rem] bg-white/60 p-2 sm:p-4">
      <WorkspaceTabs eventId={id} labels={labels} />
      {children}
    </div>
  );
}
