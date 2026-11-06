// Shared by the editor (client), the public page and server actions — no server-only imports.

export type InviteLang = "km" | "en";
export const INVITE_LANGS: InviteLang[] = ["km", "en"];

export type TemplateId = "royal" | "petal" | "olive" | "lotus";

/** Google Maps share / place links (maps.app.goo.gl, goo.gl/maps, google.*\/maps, maps.google.*) */
export function isGoogleMapsUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "maps.app.goo.gl" ||
      (h === "goo.gl" && u.pathname.startsWith("/maps")) ||
      /^maps\.google\.[a-z.]+$/.test(h) ||
      (/^(www\.)?google\.[a-z.]+$/.test(h) && u.pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}

/**
 * The iframe src for the venue map: the pasted Google Maps link wins (resolved on the server into
 * `mapEmbedUrl`, since Google won't frame share links); otherwise a search for venue + address.
 */
export function mapEmbedSrc(data: { mapEmbedUrl?: string | null; venue?: string | null; venueEn?: string | null; address?: string | null }) {
  if (data.mapEmbedUrl) return data.mapEmbedUrl;
  const q = [data.venueEn ?? data.venue, data.address].filter(Boolean).join(", ");
  return q ? `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed` : null;
}

export const TEMPLATES: {
  id: TemplateId;
  name: Record<InviteLang, string>;
  colors: { titleTop: string; titleBottom: string; titleOutline: string };
}[] = [
  {
    id: "royal",
    name: { km: "រាជវាំងមាស", en: "Royal gold" },
    colors: { titleTop: "#B8862F", titleBottom: "#7A5418", titleOutline: "#FFF8E8" },
  },
  {
    id: "petal",
    name: { km: "ផ្ការោយ", en: "Falling petals" },
    colors: { titleTop: "#FFEBD6", titleBottom: "#D9A26E", titleOutline: "#6B3A22" },
  },
  {
    id: "olive",
    name: { km: "បៃតងអូលីវ", en: "Olive classic" },
    colors: { titleTop: "#8A8A2B", titleBottom: "#5E5E1A", titleOutline: "#FFFFFF" },
  },
  {
    id: "lotus",
    name: { km: "ផ្កាឈូករាជ", en: "Lotus arch" },
    colors: { titleTop: "#C49C50", titleBottom: "#74551F", titleOutline: "#FFFCF7" },
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** Wording printed on the invitation itself, in the invitation's language. */
export const INVITE_TEXT: Record<
  InviteLang,
  {
    title: string;
    and: string;
    invite: string;
    dearGuest: string;
    message: string;
    scroll: string;
    when: string;
    where: string;
    openMap: string;
    countdown: string;
    days: string;
    today: string;
    agenda: string;
    thanks: string;
    playMusic: string;
    pauseMusic: string;
  }
> = {
  km: {
    title: "សិរីមង្គលអាពាហ៍ពិពាហ៍",
    and: "និង",
    invite: "សូមគោរពអញ្ជើញ",
    dearGuest: "ភ្ញៀវកិត្តិយស",
    message: "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ អញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីអាពាហ៍ពិពាហ៍ របស់យើងខ្ញុំ។",
    scroll: "សូមអូសចុះក្រោម",
    when: "កាលបរិច្ឆេទ",
    where: "ទីកន្លែង",
    openMap: "មើលផែនទី",
    countdown: "នៅសល់",
    days: "ថ្ងៃ",
    today: "ថ្ងៃនេះ!",
    agenda: "កម្មវិធី",
    thanks: "សូមអរគុណ",
    playMusic: "ចាក់តន្ត្រី",
    pauseMusic: "ផ្អាកតន្ត្រី",
  },
  en: {
    title: "Wedding Celebration",
    and: "&",
    invite: "You are cordially invited",
    dearGuest: "Dear Guest",
    message: "Together with our families, we joyfully invite you to celebrate our wedding day with us.",
    scroll: "Scroll down",
    when: "When",
    where: "Where",
    openMap: "Open map",
    countdown: "Only",
    days: "days to go",
    today: "Today!",
    agenda: "Programme",
    thanks: "Thank you",
    playMusic: "Play music",
    pauseMusic: "Pause music",
  },
};

/** Everything the invitation renderer needs; built from Event + Invitation rows. */
export type InvitationData = {
  template: TemplateId;
  lang: InviteLang;
  title: string | null;
  titleEnabled: boolean;
  titleTop: string;
  titleBottom: string;
  titleOutline: string;
  message: string | null;
  showDetails: boolean;
  showCountdown: boolean;
  showAgenda: boolean;
  musicUrl: string | null;
  coverUrl: string | null;
  groomName: string;
  brideName: string;
  startsAt: string; // ISO
  venue: string | null;
  address: string | null;
  mapUrl: string | null;
  /** mapUrl turned into an embeddable map URL on the server (see lib/map-embed) */
  mapEmbedUrl?: string | null;
  agenda: string | null;
  guestName: string | null;
  // Royal gold template extras
  titleEn: string | null;
  groomNameEn: string | null;
  brideNameEn: string | null;
  groomParents: string | null;
  groomParentsEn: string | null;
  brideParents: string | null;
  brideParentsEn: string | null;
  venueEn: string | null;
  groomPhotoUrl: string | null;
  bridePhotoUrl: string | null;
  venuePhotoUrl: string | null;
  /** ចំណងដៃ section: bank KHQR images and account details per side */
  showGiftQr: boolean;
  khqrUsdUrl: string | null;
  khqrKhrUrl: string | null;
  giftUsdBank: string | null;
  giftUsdName: string | null;
  giftUsdAccount: string | null;
  giftKhrBank: string | null;
  giftKhrName: string | null;
  giftKhrAccount: string | null;
  showParents: boolean;
  showMap: boolean;
  showRsvp: boolean;
  themeColor: string;
  background: string;
  backgroundUrl: string | null;
  /** Photo gallery (in order); templates fall back to the cover/couple photos when empty */
  galleryUrls: string[];
  fontStyle: string;
  /** Contact phone numbers, one per line */
  contactPhones: string | null;
  /** Lunar-calendar date line typed by the couple */
  lunarDate: string | null;
  /** Where the RSVP form posts; null in the editor preview (form is shown but inactive) */
  rsvp: { shareId: string; guestId: string | null } | null;
};

/** Royal gold theme colors (as in the reference's Design Settings) */
export const THEME_COLORS = [
  { value: "#B8862F", name: { km: "មាស", en: "Gold" } },
  { value: "#7A4E1E", name: { km: "ត្នោត", en: "Brown" } },
  { value: "#D4A24C", name: { km: "មាសស្រាល", en: "Light gold" } },
  { value: "#2F5D50", name: { km: "បៃតងចាស់", en: "Deep green" } },
  { value: "#2C6E9E", name: { km: "ខៀវ", en: "Blue" } },
];
/** Background presets; "custom" uses the uploaded BACKGROUND photo */
export const BACKGROUNDS = ["temple", "damask", "peach", "floral", "custom"] as const;
export const FONT_STYLES = ["serif", "sans"] as const;

export const HEX = /^#[0-9a-fA-F]{6}$/;

const KM_DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const khmerDigits = (n: number | string) => String(n).replace(/\d/g, (d) => "០១២៣៤៥៦៧៨៩"[Number(d)]);

/**
 * Event date in Cambodia time, worded for an invitation. Done by hand rather than with
 * Intl because many browsers ship without Khmer locale data (they'd fall back to English).
 */
export function formatInviteDate(iso: string, lang: InviteLang) {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000); // UTC+7, read with getUTC*
  const [day, date, month, year] = [d.getUTCDay(), d.getUTCDate(), d.getUTCMonth(), d.getUTCFullYear()];
  const h = d.getUTCHours();
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const h12 = h % 12 || 12;
  if (lang === "km") {
    const period = h < 12 ? "ព្រឹក" : h < 13 ? "ថ្ងៃត្រង់" : h < 17 ? "រសៀល" : h < 19 ? "ល្ងាច" : "យប់";
    return `ថ្ងៃ${KM_DAYS[day]} ទី${khmerDigits(date)} ខែ${KM_MONTHS[month]} ឆ្នាំ${khmerDigits(year)} វេលាម៉ោង ${khmerDigits(`${h12}:${mm}`)} ${period}`;
  }
  return `${EN_DAYS[day]}, ${date} ${EN_MONTHS[month]} ${year} · ${h12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

export const formatInviteNumber = (n: number, lang: InviteLang) => (lang === "km" ? khmerDigits(n) : String(n));
