import { chooseTemplate } from "@/features/invitation/actions";
import { requireOwnedEvent } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { ownerInvitationData } from "@/features/invitation/owner-data";
import { TemplateStore } from "@/features/invitation/editor/TemplateStore";
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
