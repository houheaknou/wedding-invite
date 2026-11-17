import type { InviteLang } from "@/features/invitation/shared";

/**
 * The message sent with an invitation link on Telegram: greeting, date, time, place, the couple and
 * the link at the bottom (Telegram shows the invitation's preview card under it).
 */

export type ShareMessageInput = {
  lang: InviteLang;
  guestName?: string | null;
  groomName: string;
  brideName: string;
  groomNameEn?: string | null;
  brideNameEn?: string | null;
  /** Date or ISO string; worded in Cambodia time */
  startsAt: Date | string;
  venue?: string | null;
  venueEn?: string | null;
  address?: string | null;
  url: string;
};

const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const km = (v: number | string) => String(v).replace(/\d/g, (d) => "០១២៣៤៥៦៧៨៩"[Number(d)]);
const clean = (v: string | null | undefined) => v?.trim() || "";

export function inviteShareMessage(m: ShareMessageInput): string {
  const d = new Date(new Date(m.startsAt).getTime() + 7 * 60 * 60 * 1000); // UTC+7, read with getUTC*
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  const h12 = h % 12 || 12;
  const guest = clean(m.guestName);

  if (m.lang === "en") {
    const place = [clean(m.venueEn) || clean(m.venue), clean(m.address)].filter(Boolean).join(", ");
    const time = `${min ? `${h12}:${String(min).padStart(2, "0")}` : h12} ${h < 12 ? "AM" : "PM"}`;
    const groom = clean(m.groomNameEn) || m.groomName;
    const bride = clean(m.brideNameEn) || m.brideName;
    return [
      "You're warmly invited 🙏",
      "",
      ...(guest ? [`Dear ${guest},`] : []),
      "We would be honoured to have you join us to celebrate our wedding",
      "and share this special day with us.",
      "",
      `📅 Date: ${String(d.getUTCDate()).padStart(2, "0")} ${EN_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      `🕓 Time: ${time}`,
      ...(place ? [`📍 Venue: ${place}`] : []),
      "",
      "Your presence will make our day truly special and meaningful ❤️",
      "",
      `${groom} & ${bride}`,
      "",
      `🌐 Link to invitation: ${m.url}`,
    ].join("\n");
  }

  const place = [clean(m.venue), clean(m.address)].filter(Boolean).join(", ");
  const period = h < 12 ? "ព្រឹក" : h < 13 ? "ថ្ងៃត្រង់" : h < 17 ? "រសៀល" : h < 19 ? "ល្ងាច" : "យប់";
  const time = `${km(min ? `${h12}:${String(min).padStart(2, "0")}` : h12)} ${period}`;
  const you = guest ? "បង" : "លោកអ្នក";
  return [
    "សូមគោរពអញ្ជើញ 🙏",
    "",
    ...(guest ? [`ជំរាបសួរ ${guest}`] : []),
    `ខ្ញុំសូមគោរពអញ្ជើញ${you}មកចូលរួម និងអបអរសាទរពិធីមង្គលការរបស់ខ្ញុំ`,
    "ហើយរីករាយជាមួយពេលវេលាពិសេសនេះ។",
    "",
    `📅 កាលបរិច្ឆេទ: ${km(String(d.getUTCDate()).padStart(2, "0"))} ${KM_MONTHS[d.getUTCMonth()]} ${km(d.getUTCFullYear())}`,
    `🕓 ម៉ោង: ${time}`,
    ...(place ? [`📍 ទីកន្លែង: ${place}`] : []),
    "",
    `វត្តមានរបស់${you} នឹងធ្វើឲ្យថ្ងៃនេះពិសេស និងមានអត្ថន័យច្រើន ❤️`,
    "",
    `${m.groomName} និង ${m.brideName}`,
    "",
    `🌐 Link to invitation: ${m.url}`,
  ].join("\n");
}
