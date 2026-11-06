import { notFound } from "next/navigation";
import { updateGuest } from "@/actions/guests";
import { prisma } from "@/lib/db";
import { requireOwnedEvent } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { GuestForm } from "@/components/GuestForm";
import { Avatar, card } from "@/components/ui";
import { pick, GUEST_FORM_KEYS } from "@/lib/ui-keys";

export default async function EditGuestPage({
  params,
}: {
  params: Promise<{ id: string; guestId: string }>;
}) {
  const { id, guestId } = await params;
  await requireOwnedEvent(id);
  const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId: id } });
  if (!guest) notFound();
  const { t } = await getDict();
  return (
    <div className={`${card} mx-auto max-w-2xl sm:p-7`}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={guest.name} className="size-10 text-sm" />
        <h1 className="text-xl font-bold">{t.editGuest}</h1>
      </div>
      <GuestForm action={updateGuest.bind(null, id, guestId)} t={pick(t, GUEST_FORM_KEYS)} guest={guest} cancelHref={`/events/${id}/guests`} />
    </div>
  );
}
