import { createEvent } from "@/actions/events";
import { getDict } from "@/lib/i18n";
import { EventForm } from "@/components/EventForm";
import { card } from "@/components/ui";

export default async function NewEventPage() {
  const { t } = await getDict();
  return (
    <div className={`${card} mx-auto max-w-3xl sm:p-7`}>
      <h1 className="mb-4 text-xl font-bold">{t.newEvent}</h1>
      <EventForm action={createEvent} t={t} cancelHref="/events" submitLabel={t.create} />
    </div>
  );
}
