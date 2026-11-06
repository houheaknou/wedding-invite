import { describe, expect, it } from "vitest";
import { parseLocalDateTime, toLocalInputValue } from "@/lib/format";
import { parseAgenda, serializeAgenda } from "@/lib/agenda";

describe("event times are Cambodia time (UTC+7)", () => {
  it("reads a datetime-local value as Phnom Penh time", () => {
    expect(parseLocalDateTime("2026-12-20T17:00")?.toISOString()).toBe("2026-12-20T10:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("2026-12-20 17:00")).toBeNull();
    expect(parseLocalDateTime("2026-13-45T99:99")).toBeNull();
  });

  it("round-trips through the form field value", () => {
    const d = parseLocalDateTime("2026-01-01T00:30")!;
    expect(toLocalInputValue(d)).toBe("2026-01-01T00:30");
  });
});

describe("programme (agenda) text", () => {
  const text = [
    "## Day 1 – Traditional ceremony | Friday, 22 November 2026",
    "07:00 AM Groom's procession",
    "០៩:០០ព្រឹក សូត្រមន្ត",
    "Lunch for family",
    "## Day 2 – Reception",
    "05:00 PM Dinner",
  ].join("\n");

  it("splits days, times (incl. Khmer numerals) and untimed lines", () => {
    const days = parseAgenda(text);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ title: "Day 1 – Traditional ceremony", date: "Friday, 22 November 2026" });
    expect(days[0].items).toEqual([
      { time: "07:00 AM", text: "Groom's procession" },
      { time: "០៩:០០ព្រឹក", text: "សូត្រមន្ត" },
      { time: "", text: "Lunch for family" },
    ]);
    expect(days[1]).toMatchObject({ title: "Day 2 – Reception", date: "", items: [{ time: "05:00 PM", text: "Dinner" }] });
  });

  it("keeps old single-list agendas (no ## headings) as one untitled day", () => {
    const days = parseAgenda("08:00 Breakfast\n10:00 Ceremony");
    expect(days).toEqual([{ title: "", date: "", items: [{ time: "08:00", text: "Breakfast" }, { time: "10:00", text: "Ceremony" }] }]);
    expect(serializeAgenda(days)).toBe("08:00 Breakfast\n10:00 Ceremony");
  });

  it("serialises back to text that parses the same", () => {
    expect(parseAgenda(serializeAgenda(parseAgenda(text)))).toEqual(parseAgenda(text));
  });

  it("handles empty input", () => {
    expect(parseAgenda(null)).toEqual([]);
    expect(serializeAgenda([])).toBe("");
  });
});
