// Programme stored as plain text in Event.agenda, so old single-list agendas keep working:
//   ## Day 1 – Traditional ceremony | Friday, 22 November 2026
//   07:00 AM Groom's procession
// Lines before the first "##" form an untitled day.

export type ProgrammeItem = { time: string; text: string };
export type ProgrammeDay = { title: string; date: string; items: ProgrammeItem[] };

// "07:00 AM …" or Khmer "០៧:០០ព្រឹក …" (Khmer numerals + period of day)
const TIME = /^([\d០-៩]{1,2}[:.][\d០-៩]{2}(?:\s?(?:[AaPp]\.?[Mm]\.?|ព្រឹក|ថ្ងៃត្រង់|រសៀល|ល្ងាច|យប់))?)\s+(.+)$/;

export function parseAgenda(text: string | null | undefined): ProgrammeDay[] {
  const days: ProgrammeDay[] = [];
  let current: ProgrammeDay | null = null;
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      const [title, date = ""] = line.replace(/^##\s*/, "").split("|").map((s) => s.trim());
      current = { title, date, items: [] };
      days.push(current);
      continue;
    }
    if (!current) {
      current = { title: "", date: "", items: [] };
      days.push(current);
    }
    const m = TIME.exec(line);
    current.items.push(m ? { time: m[1], text: m[2].trim() } : { time: "", text: line });
  }
  return days;
}

export function serializeAgenda(days: ProgrammeDay[]): string {
  const lines: string[] = [];
  const titled = days.length > 1 || days.some((d) => d.title || d.date);
  for (const day of days) {
    const items = day.items.filter((i) => i.time.trim() || i.text.trim());
    if (!items.length && !day.title && !day.date) continue;
    if (titled) lines.push(`## ${day.title.trim()}${day.date.trim() ? ` | ${day.date.trim()}` : ""}`);
    for (const i of items) lines.push(`${i.time.trim()} ${i.text.trim()}`.trim());
  }
  return lines.join("\n");
}
