import { updateEvent } from "@/features/events/actions";
import { requireOwnedEvent } from "@/features/auth/session";
import { getDict } from "@/lib/i18n";
import { coverUrl, toLocalInputValue } from "@/lib/format";
import { EventForm } from "@/features/events/EventForm";
import { card } from "@/components/ui";
import { pick, EVENT_FORM_KEYS } from "@/lib/ui-keys";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireOwnedEvent(id);
  const { t } = await getDict();
  const [date, time] = toLocalInputValue(event.startsAt).split("T");
  return (
    <div className={`${card} mx-auto max-w-3xl sm:p-7`}>
      <h1 className="mb-4 text-xl font-bold">{t.editEvent}</h1>
      <EventForm
        action={updateEvent.bind(null, id)}
        t={pick(t, EVENT_FORM_KEYS)}
        cancelHref={`/events/${id}`}
        submitLabel={t.save}
        defaults={{ ...event, date, time, coverUrl: coverUrl(event) }}
      />
    </div>
  );
}
