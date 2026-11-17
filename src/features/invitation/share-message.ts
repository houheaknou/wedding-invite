import type { InviteLang } from "@/features/invitation/shared";

/**
 * The message sent with an invitation link on Telegram: a decorated card-like text with the greeting,
 * date, time, place, the couple and the link at the bottom (Telegram shows the preview card under it).
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
  /** How the guest is addressed in Khmer (older / younger / formal…); default បង, or លោកអ្នក with no guest */
  term?: KhmerTerm;
  url: string;
};

/** Khmer forms of address, in the order the share menu shows them */
export const KHMER_TERMS = ["បង", "ប្អូន", "លោក", "អ្នកស្រី", "លោកអ្នក"] as const;
export type KhmerTerm = (typeof KHMER_TERMS)[number];

const KM_DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const km = (v: number | string) => String(v).replace(/\d/g, (d) => "០១២៣៤៥៦៧៨៩"[Number(d)]);
const clean = (v: string | null | undefined) => v?.trim() || "";
/** Ribbon around the date / time / place block */
export const SHARE_DIVIDER = "┈┈┈┈┈┈ ♡ ┈┈┈┈┈┈";

export function inviteShareMessage(m: ShareMessageInput): string {
  const d = new Date(new Date(m.startsAt).getTime() + 7 * 60 * 60 * 1000); // UTC+7, read with getUTC*
  const [day, date, month, year] = [d.getUTCDay(), d.getUTCDate(), d.getUTCMonth(), d.getUTCFullYear()];
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  const h12 = h % 12 || 12;
  const hm = min ? `${h12}:${String(min).padStart(2, "0")}` : String(h12);
  const guest = clean(m.guestName);

  if (m.lang === "en") {
    const place = [clean(m.venueEn) || clean(m.venue), clean(m.address)].filter(Boolean).join(", ");
    const groom = clean(m.groomNameEn) || m.groomName;
    const bride = clean(m.brideNameEn) || m.brideName;
    return [
      "💌✨ Wedding Invitation ✨💌",
      "",
      ...(guest ? [`🌸 Dear ${guest} 🌸`, ""] : []),
      "💍 With joy in our hearts, we warmly invite you",
      "to celebrate our wedding day with us 🥰",
      "",
      SHARE_DIVIDER,
      `🗓️ ${EN_DAYS[day]}, ${date} ${EN_MONTHS[month]} ${year}`,
      `⏰ ${hm} ${h < 12 ? "AM" : "PM"}`,
      ...(place ? [`📍 ${place}`] : []),
      SHARE_DIVIDER,
      "",
      "💕 Your presence would mean the world to us 💕",
      "",
      `🤵 ${groom}  💞  ${bride} 👰`,
      "",
      "👇 Tap to open the invitation 👇",
      m.url,
    ].join("\n");
  }

  const place = [clean(m.venue), clean(m.address)].filter(Boolean).join(", ");
  const period = h < 12 ? "ព្រឹក" : h < 13 ? "ថ្ងៃត្រង់" : h < 17 ? "រសៀល" : h < 19 ? "ល្ងាច" : "យប់";
  const you: KhmerTerm = m.term ?? (guest ? "បង" : "លោកអ្នក");
  // "បង ហូ ហៀកនូ": add the term before the name unless it was typed as part of it
  const named = guest && !guest.startsWith(you) ? `${you} ${guest}` : guest;
  // a younger guest gets a friendly hello instead of the respectful one
  const younger = you === "ប្អូន";
  const hello = younger ? "សួស្តី" : "ជំរាបសួរ";
  const invite = younger ? "សូមអញ្ជើញ" : "សូមគោរពអញ្ជើញ";
  return [
    "💌✨ សំបុត្រអញ្ជើញមង្គលការ ✨💌",
    "",
    ...(guest ? [`🌸 ${hello} ${named} 🌸`, ""] : []),
    `💍 យើងខ្ញុំទាំងពីរ ${invite}${you}`,
    "មកចូលរួមអបអរសាទរ ពិធីមង្គលការរបស់យើងខ្ញុំ",
    "និងរីករាយជាមួយពេលវេលាដ៏ពិសេសនេះ 🥰",
    "",
    SHARE_DIVIDER,
    `🗓️ ថ្ងៃ${KM_DAYS[day]} ទី${km(String(date).padStart(2, "0"))} ខែ${KM_MONTHS[month]} ឆ្នាំ${km(year)}`,
    `⏰ ម៉ោង ${km(hm)} ${period}`,
    ...(place ? [`📍 ${place}`] : []),
    SHARE_DIVIDER,
    "",
    `💕 វត្តមានរបស់${you} គឺជាកិត្តិយស និងសុភមង្គលដ៏ធំសម្រាប់យើងខ្ញុំ 💕`,
    "",
    `🤵 ${m.groomName}  💞  ${m.brideName} 👰`,
    "",
    "👇 ចុចទីនេះដើម្បីមើលធៀបការ 👇",
    m.url,
  ].join("\n");
}
