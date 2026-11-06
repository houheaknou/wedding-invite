import { createEvent } from "@/actions/events";
import { getDict } from "@/lib/i18n";
import { EventForm } from "@/components/EventForm";
import { card } from "@/components/ui";
import { pick, EVENT_FORM_KEYS } from "@/lib/ui-keys";

export default async function NewEventPage() {
  const { t } = await getDict();
  return (
    <div className={`${card} mx-auto max-w-3xl sm:p-7`}>
      <h1 className="mb-4 text-xl font-bold">{t.newEvent}</h1>
      <EventForm action={createEvent} t={pick(t, EVENT_FORM_KEYS)} cancelHref="/events" submitLabel={t.create} />
    </div>
  );
}
