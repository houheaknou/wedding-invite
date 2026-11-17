import { describe, expect, it } from "vitest";
import { inviteShareMessage } from "@/features/invitation/share-message";

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
  it("follows the Khmer sample: greeting, date, time, place, couple, link last", () => {
    expect(inviteShareMessage({ ...base, lang: "km", guestName: "បង ហូ ហៀកនូ" })).toBe(
      [
        "សូមគោរពអញ្ជើញ 🙏",
        "",
        "ជំរាបសួរ បង ហូ ហៀកនូ",
        "ខ្ញុំសូមគោរពអញ្ជើញបងមកចូលរួម និងអបអរសាទរពិធីមង្គលការរបស់ខ្ញុំ",
        "ហើយរីករាយជាមួយពេលវេលាពិសេសនេះ។",
        "",
        "📅 កាលបរិច្ឆេទ: ០៦ វិច្ឆិកា ២០២៥",
        "🕓 ម៉ោង: ៤ រសៀល",
        "📍 ទីកន្លែង: ផ្ទះលេខ 53, ភូមិ ១",
        "",
        "វត្តមានរបស់បង នឹងធ្វើឲ្យថ្ងៃនេះពិសេស និងមានអត្ថន័យច្រើន ❤️",
        "",
        "សួរ សក្កដា និង ឯម កក្កដា",
        "",
        "🌐 Link to invitation: https://example.com/i/abc/g1",
      ].join("\n"),
    );
  });

  it("without a guest: no greeting line, addresses លោកអ្នក; no place line when empty", () => {
    const msg = inviteShareMessage({ ...base, lang: "km", venue: null, address: " " });
    expect(msg).not.toContain("ជំរាបសួរ");
    expect(msg).toContain("អញ្ជើញលោកអ្នកមកចូលរួម");
    expect(msg).not.toContain("📍");
  });

  it("shows minutes only when there are some, and English uses the English names", () => {
    const msg = inviteShareMessage({ ...base, lang: "en", startsAt: "2025-11-06T10:30:00.000Z", guestName: "Nou" });
    expect(msg).toContain("Dear Nou,");
    expect(msg).toContain("🕓 Time: 5:30 PM");
    expect(msg).toContain("📅 Date: 06 November 2025");
    expect(msg).toContain("Sour Sakada & Em Kakada");
    expect(msg.endsWith("🌐 Link to invitation: https://example.com/i/abc/g1")).toBe(true);
  });
});
