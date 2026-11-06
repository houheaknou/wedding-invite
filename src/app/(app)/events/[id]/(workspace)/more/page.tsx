import { chooseTemplate } from "@/actions/invitation";
import { requireOwnedEvent } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { ownerInvitationData } from "@/lib/owner-invitation";
import { TemplateStore } from "@/components/TemplateStore";
import { pick, TEMPLATE_STORE_KEYS } from "@/lib/ui-keys";

export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOwnedEvent(id);
  const { t } = await getDict();
  const data = await ownerInvitationData(id);
  return (
    <TemplateStore
      t={pick(t, TEMPLATE_STORE_KEYS)}
      data={data}
      current={data.template}
      editHref={`/events/${id}/template`}
      choose={chooseTemplate.bind(null, id)}
    />
  );
}
