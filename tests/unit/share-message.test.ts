import { describe, expect, it } from "vitest";
import { inviteShareMessage, SHARE_DIVIDER } from "@/features/invitation/share-message";

const base = {
  groomName: "សួរ សក្កដា",
  brideName: "ឯម កក្កដា",
  groomNameEn: "Sour Sakada",
  brideNameEn: "Em Kakada",
  startsAt: "2025-11-06T09:00:00.000Z", // 4:00 PM in Cambodia
  venue: "ផ្ទះលេខ 53",
  address: "ភូមិ ១",
  url: "https://example.com/i/abc/g1",
};

describe("inviteShareMessage (Telegram invitation text)", () => {
  it("Khmer: greeting, date with weekday, time, place in a ribbon, couple, link last", () => {
    expect(inviteShareMessage({ ...base, lang: "km", guestName: "បង ហូ ហៀកនូ" })).toBe(
      [
        "💌✨ សំបុត្រអញ្ជើញមង្គលការ ✨💌",
        "",
        "🌸 ជំរាបសួរ បង ហូ ហៀកនូ 🌸",
        "",
        "💍 យើងខ្ញុំទាំងពីរ សូមគោរពអញ្ជើញបង",
        "មកចូលរួមអបអរសាទរ ពិធីមង្គលការរបស់យើងខ្ញុំ",
        "និងរីករាយជាមួយពេលវេលាដ៏ពិសេសនេះ 🥰",
        "",
        SHARE_DIVIDER,
        "🗓️ ថ្ងៃព្រហស្បតិ៍ ទី០៦ ខែវិច្ឆិកា ឆ្នាំ២០២៥",
        "⏰ ម៉ោង ៤ រសៀល",
        "📍 ផ្ទះលេខ 53, ភូមិ ១",
        SHARE_DIVIDER,
        "",
        "💕 វត្តមានរបស់បង គឺជាកិត្តិយស និងសុភមង្គលដ៏ធំសម្រាប់យើងខ្ញុំ 💕",
        "",
        "🤵 សួរ សក្កដា  💞  ឯម កក្កដា 👰",
        "",
        "👇 ចុចទីនេះដើម្បីមើលធៀបការ 👇",
        "https://example.com/i/abc/g1",
      ].join("\n"),
    );
  });

  it("a younger guest (ប្អូន): friendly hello, no គោរព, and ប្អូន throughout", () => {
    const msg = inviteShareMessage({ ...base, lang: "km", guestName: "ដារ៉ា", term: "ប្អូន" });
    expect(msg).toContain("🌸 សួស្តី ប្អូន ដារ៉ា 🌸");
    expect(msg).toContain("💍 យើងខ្ញុំទាំងពីរ សូមអញ្ជើញប្អូន");
    expect(msg).toContain("💕 វត្តមានរបស់ប្អូន គឺជាកិត្តិយស");
    expect(msg).not.toContain("បង");
  });

  it("other terms keep the respectful wording; the term isn't doubled when typed in the name", () => {
    const lok = inviteShareMessage({ ...base, lang: "km", guestName: "សុខ ចាន់", term: "លោក" });
    expect(lok).toContain("🌸 ជំរាបសួរ លោក សុខ ចាន់ 🌸");
    expect(lok).toContain("សូមគោរពអញ្ជើញលោក");
    const typed = inviteShareMessage({ ...base, lang: "km", guestName: "អ្នកស្រី ស្រីពៅ", term: "អ្នកស្រី" });
    expect(typed).toContain("🌸 ជំរាបសួរ អ្នកស្រី ស្រីពៅ 🌸");
  });

  it("without a guest: no greeting line, addresses លោកអ្នក; no place line when empty", () => {
    const msg = inviteShareMessage({ ...base, lang: "km", venue: null, address: " " });
    expect(msg).not.toContain("ជំរាបសួរ");
    expect(msg).toContain("សូមគោរពអញ្ជើញលោកអ្នក");
    expect(msg).not.toContain("📍");
  });

  it("shows minutes only when there are some, and English uses the English names", () => {
    const msg = inviteShareMessage({ ...base, lang: "en", startsAt: "2025-11-06T10:30:00.000Z", guestName: "Nou" });
    expect(msg).toContain("🌸 Dear Nou 🌸");
    expect(msg).toContain("⏰ 5:30 PM");
    expect(msg).toContain("🗓️ Thursday, 6 November 2025");
    expect(msg).toContain("🤵 Sour Sakada  💞  Em Kakada 👰");
    expect(msg.endsWith("👇\nhttps://example.com/i/abc/g1")).toBe(true);
  });
});
