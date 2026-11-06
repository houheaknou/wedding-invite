"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { cropToQr } from "@/lib/crop-qr";
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  Link2,
  ListPlus,
  Music2,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { GalleryResult } from "@/actions/gallery";
import type { SaveState } from "@/actions/invitation";
import { GalleryManager, type GalleryItem } from "@/components/GalleryManager";
import { InvitationView } from "@/components/InvitationView";
import { SubmitButton } from "@/components/SubmitButton";
import { TelegramShareButton } from "@/components/TelegramShareButton";
import { ErrorText } from "@/components/ui";
import { serializeAgenda, type ProgrammeDay } from "@/lib/agenda";
import { royalFontVars } from "@/lib/invite-fonts";
import { publicUrl } from "@/lib/public-url";
import type { TemplateEditorDict } from "@/lib/ui-keys";
import {
  BACKGROUNDS,
  FONT_STYLES,
  INVITE_TEXT,
  TEMPLATES,
  THEME_COLORS,
  templateById,
  type InvitationData,
  type InviteLang,
  type TemplateId,
} from "@/lib/invitation";

export type BuilderState = {
  template: TemplateId;
  lang: InviteLang;
  published: boolean;
  title: string | null;
  titleEn: string | null;
  titleEnabled: boolean;
  titleTop: string;
  titleBottom: string;
  titleOutline: string;
  message: string | null;
  showDetails: boolean;
  showCountdown: boolean;
  showAgenda: boolean;
  showParents: boolean;
  showMap: boolean;
  showRsvp: boolean;
  showGiftQr: boolean;
  giftUsdBank: string | null;
  giftUsdName: string | null;
  giftUsdAccount: string | null;
  giftKhrBank: string | null;
  giftKhrName: string | null;
  giftKhrAccount: string | null;
  themeColor: string;
  background: string;
  fontStyle: string;
  contactPhones: string | null;
  lunarDate: string | null;
  groomName: string;
  brideName: string;
  groomNameEn: string | null;
  brideNameEn: string | null;
  groomParents: string | null;
  groomParentsEn: string | null;
  brideParents: string | null;
  brideParentsEn: string | null;
  date: string;
  time: string;
  venue: string | null;
  venueEn: string | null;
  address: string | null;
  mapUrl: string | null;
  /** the saved mapUrl resolved to an embeddable map (server) */
  mapEmbedUrl: string | null;
  days: ProgrammeDay[];
};

type EventPhotoKey = "GROOM" | "BRIDE" | "VENUE" | "BACKGROUND" | "KHQR_USD" | "KHQR_KHR";
// COVER is the event's own cover image (Event.coverImage), uploaded through the same field UI
type PhotoKey = EventPhotoKey | "COVER";
export type BuilderMedia = { coverUrl: string | null; musicUrl: string | null; musicName: string | null } & Record<EventPhotoKey, string | null>;

const TABS = ["basic", "couple", "programme", "venue", "gift", "design"] as const;
type Tab = (typeof TABS)[number];

// Builder look from the reference: neutral white/beige with gold accents
const field =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
const panel = "rounded-xl border border-stone-200/80 bg-[#fdfcf9] p-4 shadow-sm sm:p-5";
const goldBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-b from-[#d4a24c] to-[#a8782b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#c99640] disabled:opacity-60";
const softBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-amber-300 hover:bg-amber-50";

/** Section menu (left column): numbered gold steps, English + Khmer titles. */
const MENU = [
  { id: "home", en: "Cover Page", km: "ទំព័រមុខ" },
  { id: "invitation", en: "Invitation", km: "សំបុត្រអញ្ជើញ" },
  { id: "programme", en: "Wedding Programme", km: "កម្មវិធីពិធី" },
  { id: "venue", en: "Venue & Map", km: "ទីតាំងកម្មវិធី" },
  { id: "gallery", en: "Gallery", km: "កម្រងរូបភាព" },
  { id: "gift", en: "Gift (KHQR)", km: "ចំណងដៃ" },
  { id: "rsvp", en: "RSVP", km: "បញ្ជាក់ការចូលរួម" },
  { id: "footer", en: "Footer", km: "ផ្នែកបញ្ចប់" },
] as const;

function Toggle({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm text-stone-700">
      {label}
      <input type="hidden" name={name} value={checked ? "1" : "0"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#b8862f]" : "bg-stone-300"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function Label({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs text-stone-500">{text}</span>
      {children}
    </label>
  );
}

function CardTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-amber-300/70 text-[#a8782b]">{icon}</span>
      <div>
        <p className="font-semibold text-stone-800">{title}</p>
        {hint && <p className="text-xs text-stone-500">{hint}</p>}
      </div>
    </div>
  );
}

export function TemplateEditor({
  action,
  t,
  initial,
  media,
  shareId,
  gallery,
  addGalleryPhoto,
  deleteGalleryPhoto,
}: {
  action: (state: SaveState, fd: FormData) => Promise<SaveState>;
  t: TemplateEditorDict;
  initial: BuilderState;
  media: BuilderMedia;
  shareId: string;
  gallery: GalleryItem[];
  addGalleryPhoto: (fd: FormData) => Promise<GalleryResult>;
  deleteGalleryPhoto: (photoId: string) => Promise<void>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [s, setS] = useState(initial);
  const set = <K extends keyof BuilderState>(k: K, v: BuilderState[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const text = (k: keyof BuilderState) => ({
    name: k,
    value: (s[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
  });

  const [tab, setTab] = useState<Tab>("basic");
  const [galleryList, setGalleryList] = useState(gallery.map((g) => g.url));
  const [photos, setPhotos] = useState<Record<PhotoKey, string | null>>({
    GROOM: media.GROOM,
    BRIDE: media.BRIDE,
    VENUE: media.VENUE,
    BACKGROUND: media.BACKGROUND,
    KHQR_USD: media.KHQR_USD,
    KHQR_KHR: media.KHQR_KHR,
    COVER: media.coverUrl,
  });
  const [removed, setRemoved] = useState<Record<PhotoKey, boolean>>({ GROOM: false, BRIDE: false, VENUE: false, BACKGROUND: false, KHQR_USD: false, KHQR_KHR: false, COVER: false });
  const photoInputs = useRef<Partial<Record<PhotoKey, HTMLInputElement | null>>>({});
  // KHQR uploads: whether the QR was found and cropped, shown under the field
  const [qrNote, setQrNote] = useState<Partial<Record<PhotoKey, "cropped" | "notFound">>>({});
  const musicInput = useRef<HTMLInputElement>(null);
  const [music, setMusic] = useState<{ url: string | null; name: string | null }>({ url: media.musicUrl, name: media.musicName });
  const [removeMusic, setRemoveMusic] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [active, setActive] = useState<string>("home");
  const centerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOrigin(publicUrl("/").replace(/\/$/, "")), []);
  useEffect(() => {
    if (!state?.message) return;
    setShowSaved(true);
    setRemoveMusic(false);
    setRemoved({ GROOM: false, BRIDE: false, VENUE: false, BACKGROUND: false, KHQR_USD: false, KHQR_KHR: false, COVER: false });
    const id = setTimeout(() => setShowSaved(false), 2500);
    return () => clearTimeout(id);
  }, [state]);

  const shareUrl = `${origin}/i/${shareId}`;
  const tx = INVITE_TEXT[s.lang];
  const isRoyal = s.template === "royal";
  const preview: InvitationData = {
    ...s,
    startsAt: new Date(`${s.date}T${s.time || "00:00"}:00+07:00`).toISOString(),
    agenda: serializeAgenda(s.days),
    coverUrl: photos.COVER,
    musicUrl: music.url,
    groomPhotoUrl: photos.GROOM,
    bridePhotoUrl: photos.BRIDE,
    venuePhotoUrl: photos.VENUE,
    backgroundUrl: photos.BACKGROUND,
    khqrUsdUrl: photos.KHQR_USD,
    khqrKhrUrl: photos.KHQR_KHR,
    galleryUrls: galleryList,
    // the resolved map only matches the saved link; while a new one is typed, fall back to venue/address
    mapEmbedUrl: s.mapUrl === initial.mapUrl ? initial.mapEmbedUrl : null,
    guestName: null,
    rsvp: null,
  };

  function pickTemplate(id: TemplateId) {
    setS((prev) => ({ ...prev, template: id, ...templateById(id).colors }));
  }

  // --- section menu ↔ center preview ---
  function jump(id: string) {
    const box = centerRef.current;
    const el = document.getElementById(`c-${id}`);
    if (!box || !el) return;
    setActive(id);
    // Scroll only the preview box (scrollIntoView would also move the page and fight the sticky columns);
    // leave room for the invitation's own sticky menu bar
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTo({ top: id === "home" ? 0 : top - 48, behavior: "smooth" });
  }
  function onCenterScroll() {
    const box = centerRef.current;
    if (!box) return;
    const top = box.getBoundingClientRect().top + 60;
    let current: string = MENU[0].id;
    for (const m of MENU) {
      const el = document.getElementById(`c-${m.id}`);
      if (el && el.getBoundingClientRect().top <= top) current = m.id;
    }
    setActive(current);
  }

  // --- programme editing ---
  const setDays = (fn: (days: ProgrammeDay[]) => ProgrammeDay[]) => setS((prev) => ({ ...prev, days: fn(prev.days) }));
  const updateDay = (i: number, patch: Partial<ProgrammeDay>) => setDays((d) => d.map((day, j) => (j === i ? { ...day, ...patch } : day)));
  const updateItem = (i: number, k: number, patch: Partial<{ time: string; text: string }>) =>
    setDays((d) => d.map((day, j) => (j === i ? { ...day, items: day.items.map((it, m) => (m === k ? { ...it, ...patch } : it)) } : day)));

  function photoInput(kind: PhotoKey, onPicked?: () => void) {
    return (
      <>
        <input
          ref={(el) => {
            photoInputs.current[kind] = el;
          }}
          type="file"
          name={`photo_${kind}`}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const input = e.currentTarget;
            let f = input.files?.[0];
            if (!f) return;
            // KHQR: keep only the QR square (bank header/logo/name cropped away), cut from the original pixels
            if (kind === "KHQR_USD" || kind === "KHQR_KHR") {
              const cropped = await cropToQr(f);
              setQrNote((n) => ({ ...n, [kind]: cropped ? "cropped" : "notFound" }));
              if (cropped) {
                const dt = new DataTransfer();
                dt.items.add(cropped);
                input.files = dt.files; // the cropped image is what gets saved
                f = cropped;
              }
            }
            setPhotos((p) => ({ ...p, [kind]: URL.createObjectURL(f) }));
            setRemoved((r) => ({ ...r, [kind]: false }));
            onPicked?.();
          }}
        />
        {removed[kind] && <input type="hidden" name={`remove_${kind}`} value="1" />}
        {qrNote[kind] && (
          <p className={`text-xs ${qrNote[kind] === "cropped" ? "text-emerald-700" : "text-amber-700"}`}>
            {qrNote[kind] === "cropped" ? t.bQrCropped : t.bQrNotFound}
          </p>
        )}
      </>
    );
  }
  function clearPhoto(kind: PhotoKey) {
    const input = photoInputs.current[kind];
    if (input) input.value = "";
    setPhotos((p) => ({ ...p, [kind]: null }));
    setRemoved((r) => ({ ...r, [kind]: true }));
  }

  function photoField(kind: PhotoKey, label: string, round: boolean) {
    const url = photos[kind];
    return (
      <div className="space-y-1.5">
        <span className="text-xs text-stone-500">{label}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => photoInputs.current[kind]?.click()}
            className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-amber-300 bg-amber-50/60 text-amber-500 ${
              round ? "size-20 rounded-full" : "h-20 w-32 rounded-lg"
            }`}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview / auth-gated route
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6" />
            )}
          </button>
          {/* in a narrow half-width column the buttons wrap under each other instead of spilling out */}
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <button type="button" onClick={() => photoInputs.current[kind]?.click()} className={`${softBtn} whitespace-nowrap`}>
              <Upload className="size-3.5" />
              {t.bUpload}
            </button>
            {url && (
              <button
                type="button"
                aria-label={t.bRemove}
                onClick={() => clearPhoto(kind)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:text-red-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        {photoInput(kind)}
      </div>
    );
  }

  const tabLabels: Record<Tab, string> = {
    basic: t.bTabBasic,
    couple: t.bTabCouple,
    programme: t.bTabProgramme,
    venue: t.bTabVenue,
    gift: t.bTabGift,
    design: t.bTabDesign,
  };
  const tabHeads: Record<Tab, string> = {
    basic: t.bHeadBasic,
    couple: t.bHeadCouple,
    programme: t.bHeadProgramme,
    venue: t.bHeadVenue,
    gift: t.bHeadGift,
    design: t.bHeadDesign,
  };
  const menuDesc: Record<(typeof MENU)[number]["id"], string> = {
    home: t.menuDesc_home,
    invitation: t.menuDesc_invitation,
    programme: t.menuDesc_programme,
    venue: t.menuDesc_venue,
    gallery: t.menuDesc_gallery,
    gift: t.menuDesc_gift,
    rsvp: t.menuDesc_rsvp,
    footer: t.menuDesc_footer,
  };

  return (
    <form
      action={formAction}
      className={`${royalFontVars} grid items-start gap-5 rounded-2xl bg-[#f6f1e7] p-3 sm:p-4 xl:grid-cols-[12.5rem_minmax(0,460px)_minmax(0,1fr)]`}
    >
      <input type="hidden" name="template" value={s.template} />
      <input type="hidden" name="lang" value={s.lang} />
      <input type="hidden" name="agenda" value={serializeAgenda(s.days)} />
      <input type="hidden" name="themeColor" value={s.themeColor} />
      <input type="hidden" name="background" value={s.background} />
      <input type="hidden" name="titleTop" value={s.titleTop} />
      <input type="hidden" name="titleBottom" value={s.titleBottom} />
      <input type="hidden" name="titleOutline" value={s.titleOutline} />
      {removeMusic && <input type="hidden" name="removeMusic" value="1" />}

      {/* ---------------- left: section menu ---------------- */}
      <nav className="sticky top-20 hidden xl:block" aria-label={t.sectionsMenu}>
        <ol className="relative space-y-7 pl-1">
          <span aria-hidden className="absolute bottom-3 left-[0.95rem] top-3 border-l-2 border-dashed border-[#d9c49c]" />
          {MENU.map((m, i) => (
            <li key={m.id}>
              <button type="button" onClick={() => jump(m.id)} className="group relative flex w-full gap-3 text-left">
                <span
                  className={`relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ring-4 ring-[#f6f1e7] transition ${
                    active === m.id ? "bg-[#a8782b] scale-110" : "bg-[#c9a05a] group-hover:bg-[#b8862f]"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${active === m.id ? "text-[#7a5418]" : "text-stone-800"}`}>{m.en}</span>
                  <span className="block font-[family-name:var(--font-moul)] text-[13px] leading-7 text-[#a8782b]">{m.km}</span>
                  <span className="block text-xs leading-relaxed text-stone-500">{menuDesc[m.id]}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center text-[#b8862f]">
          <svg width="48" height="34" viewBox="0 0 48 34" aria-hidden className="mx-auto">
            <path d="M24 2c4 6 4 12 0 18-4-6-4-12 0-18z" fill="currentColor" />
            <path d="M24 20c-6-6-14-6-20-2 6 1 10 5 12 10M24 20c6-6 14-6 20-2-6 1-10 5-12 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M24 22l3 4-3 4-3-4z" fill="currentColor" />
          </svg>
          <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl italic leading-tight">
            Two hearts
            <br />
            One journey
            <br />
            Forever
          </p>
        </div>
      </nav>

      {/* ---------------- center: the invitation ---------------- */}
      <div className="sticky top-20 hidden overflow-hidden rounded-xl border border-[#e5d6b6] bg-white shadow-md xl:block">
        <div ref={centerRef} onScroll={onCenterScroll} className="h-[calc(100vh-7.5rem)] overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
          <InvitationView data={preview} heroClassName="min-h-[620px]" idPrefix="c-" />
        </div>
      </div>

      {/* ---------------- right: builder ---------------- */}
      <div className="min-w-0 space-y-4">
        <div className={panel}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-300 text-[#a8782b]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M12 3c2.5 2.5 2.5 6 0 8.5C9.5 9 9.5 5.5 12 3z" />
                <path d="M12 11.5c-3-2-7-1.5-8.5 1.5 3 0 5.5 1.5 6.5 4M12 11.5c3-2 7-1.5 8.5 1.5-3 0-5.5 1.5-6.5 4" />
                <path d="M12 17v4M9.5 21h5" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-semibold text-stone-800">{t.bBuilder}</h2>
              <p className="text-xs text-stone-500">{t.bBuilderHint}</p>
            </div>
          </div>

          {/* all six tabs visible: they wrap onto a second row instead of scrolling out of sight */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-stone-200 bg-stone-100/70 p-1 sm:grid-cols-3">
              {TABS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`truncate rounded-md px-2 py-2 text-xs transition ${
                    tab === k ? "bg-white font-semibold text-[#a8782b] shadow-sm" : "text-stone-600 hover:bg-white/60"
                  }`}
                >
                  {tabLabels[k]}
                </button>
              ))}
            </div>
          </div>

          <h3 className="mb-3 text-lg font-semibold text-[#a8782b]">{tabHeads[tab]}</h3>

          {/* 1. Basic info */}
          <div hidden={tab !== "basic"} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text={t.bTitleKm}>
                <input {...text("title")} placeholder="សេចក្តីអញ្ជើញមង្គលការ" className={`${field} py-3`} />
              </Label>
              <Label text={t.bTitleEn}>
                <textarea
                  {...text("titleEn")}
                  rows={2}
                  placeholder={"Together with their families\nYou are warmly invited to the wedding of"}
                  className={`${field} resize-none text-xs`}
                />
              </Label>
              <Label text={t.bGroomKm}>
                <input {...text("groomName")} required className={field} />
              </Label>
              <Label text={t.bBrideKm}>
                <input {...text("brideName")} required className={field} />
              </Label>
              <Label text={t.bGroomEn}>
                <input {...text("groomNameEn")} placeholder="Sokha" className={field} />
              </Label>
              <Label text={t.bBrideEn}>
                <input {...text("brideNameEn")} placeholder="Dara" className={field} />
              </Label>
              <Label text={t.bWeddingDate}>
                <span className="relative block">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                  <input {...text("date")} type="date" required className={`${field} pl-9`} />
                </span>
              </Label>
              <Label text={t.bWeddingTime}>
                <span className="relative block">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                  <input {...text("time")} type="time" required className={`${field} pl-9`} />
                </span>
              </Label>
            </div>
            <Label text={t.lunarDate}>
              <input {...text("lunarDate")} placeholder="ត្រូវនឹងថ្ងៃ ១៣រោច ខែអស្សុជ ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០" className={field} />
            </Label>
            <Label text={t.bMessageKm}>
              <textarea {...text("message")} rows={3} placeholder={tx.message} className={field} />
            </Label>
            <div className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
              <span className="text-stone-600">{t.invitationLanguage}</span>
              <div className="inline-flex rounded-md bg-stone-100 p-0.5">
                {(["km", "en"] as InviteLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set("lang", l)}
                    className={`rounded px-3 py-0.5 text-xs ${s.lang === l ? "bg-white font-semibold text-[#a8782b] shadow-sm" : "text-stone-600"}`}
                  >
                    {l === "km" ? "ខ្មែរ" : "English"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Couple & parents */}
          <div hidden={tab !== "couple"} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {photoField("COVER", t.coverPhoto, false)}
              {photoField("GROOM", t.bGroomPhoto, true)}
              {photoField("BRIDE", t.bBridePhoto, true)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text={t.bGroomParentsKm}>
                <textarea {...text("groomParents")} rows={2} placeholder={"លោក ជា វណ្ណៈ\nលោកស្រី ស្រី លក្ខណ៍"} className={field} />
              </Label>
              <Label text={t.bBrideParentsKm}>
                <textarea {...text("brideParents")} rows={2} placeholder={"លោក ផុន សុភ័ក្រ\nលោកស្រី ដារា សំណាង"} className={field} />
              </Label>
              <Label text={t.bGroomParentsEn}>
                <textarea {...text("groomParentsEn")} rows={2} placeholder={"Mr. Chea Vannak &\nMrs. Srey Leak"} className={field} />
              </Label>
              <Label text={t.bBrideParentsEn}>
                <textarea {...text("brideParentsEn")} rows={2} placeholder={"Mr. Phon Sopheak &\nMrs. Dara Samnang"} className={field} />
              </Label>
            </div>
            <p className="text-xs text-stone-500">{t.bParentsHint}</p>
            <Toggle name="showParents" checked={s.showParents} onChange={(v) => set("showParents", v)} label={t.bShowParents} />
            <GalleryManager initial={gallery} add={addGalleryPhoto} remove={deleteGalleryPhoto} onChange={setGalleryList} t={t} />
          </div>

          {/* 3. Programme */}
          <div hidden={tab !== "programme"} className="space-y-3">
            {s.days.map((day, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#7a5418]">
                    {t.bDay} {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDays((d) => d.filter((_, j) => j !== i))}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 hover:bg-white hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                    {t.bRemove}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={day.title}
                    onChange={(e) => updateDay(i, { title: e.target.value })}
                    placeholder={i === 0 ? "Day 1 – Traditional Ceremony" : "Day 2 – Wedding Ceremony"}
                    aria-label={t.bDayTitle}
                    className={field}
                  />
                  <input
                    value={day.date}
                    onChange={(e) => updateDay(i, { date: e.target.value })}
                    placeholder={i === 0 ? "Friday, 22 November 2026" : "Saturday, 23 November 2026"}
                    aria-label={t.bDayDate}
                    className={field}
                  />
                </div>
                {day.items.map((item, k) => (
                  // fixed columns: `field` carries w-full, so a flex row let the time box take the whole width
                  <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem] items-center gap-2">
                    <input
                      value={item.time}
                      onChange={(e) => updateItem(i, k, { time: e.target.value })}
                      placeholder="07:00 AM"
                      aria-label={t.bTime}
                      className={field}
                    />
                    <input
                      value={item.text}
                      onChange={(e) => updateItem(i, k, { text: e.target.value })}
                      placeholder={t.bActivity}
                      aria-label={t.bActivity}
                      className={field}
                    />
                    <button
                      type="button"
                      aria-label={t.bRemove}
                      onClick={() => updateDay(i, { items: day.items.filter((_, m) => m !== k) })}
                      className="inline-flex size-9 items-center justify-center rounded-md text-stone-400 hover:bg-white hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateDay(i, { items: [...day.items, { time: "", text: "" }] })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#a8782b] hover:underline"
                >
                  <ListPlus className="size-4" />
                  {t.bAddItem}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDays((d) => [...d, { title: "", date: "", items: [{ time: "", text: "" }] }])}
              className={softBtn}
            >
              <Plus className="size-4" />
              {t.bAddDay}
            </button>
            <Toggle name="showAgenda" checked={s.showAgenda} onChange={(v) => set("showAgenda", v)} label={t.bShowProgramme} />
          </div>

          {/* 4. Venue & RSVP */}
          <div hidden={tab !== "venue"} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text={t.bVenueKm}>
                <input {...text("venue")} placeholder="សាលពិធីព្រះរាជវាំង" className={field} />
              </Label>
              <Label text={t.bVenueEn}>
                <input {...text("venueEn")} placeholder="The Royal Palace Ballroom" className={field} />
              </Label>
              <Label text={t.address} className="sm:col-span-2">
                <input {...text("address")} placeholder="#123, Sothearos Blvd, Phnom Penh, Cambodia" className={field} />
              </Label>
              <Label text={t.mapLink} className="sm:col-span-2">
                <input {...text("mapUrl")} type="url" placeholder="https://maps.app.goo.gl/…" className={field} />
              </Label>
              <Label text={t.contactPhones} className="sm:col-span-2">
                <textarea {...text("contactPhones")} rows={3} placeholder={"015 78 44 80\n016 90 81 95"} className={field} />
              </Label>
            </div>
            {photoField("VENUE", t.bVenuePhoto, false)}
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <Toggle name="showDetails" checked={s.showDetails} onChange={(v) => set("showDetails", v)} label={t.bShowVenue} />
              <Toggle name="showMap" checked={s.showMap} onChange={(v) => set("showMap", v)} label={t.bShowMap} />
              <Toggle name="showRsvp" checked={s.showRsvp} onChange={(v) => set("showRsvp", v)} label={t.bShowRsvp} />
              <Toggle name="showCountdown" checked={s.showCountdown} onChange={(v) => set("showCountdown", v)} label={t.showCountdown} />
            </div>
          </div>

          {/* 5. ចំណងដៃ: bank KHQR per currency (USD / KHR account), shown on the invitation for guests to scan */}
          <div hidden={tab !== "gift"} className="space-y-4">
            <p className="rounded-lg bg-amber-50/70 px-3 py-2 text-xs text-stone-600">{t.bGiftHint}</p>
            {(
              [
                ["USD", "giftUsdBank", "giftUsdName", "giftUsdAccount", t.bGiftUsd],
                ["KHR", "giftKhrBank", "giftKhrName", "giftKhrAccount", t.bGiftKhr],
              ] as const
            ).map(([side, bank, name, account, title]) => (
              <div key={side} className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
                <p className="text-sm font-semibold text-stone-800">{title}</p>
                {photoField(`KHQR_${side}`, t.bGiftQrImage, false)}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label text={t.bGiftBank}>
                    <input {...text(bank)} placeholder="ABA / ACLEDA / Wing" className={field} />
                  </Label>
                  <Label text={t.bGiftAccountName}>
                    <input {...text(name)} placeholder="SOKHA CHAN" className={field} />
                  </Label>
                  <Label text={t.bGiftAccountNo} className="sm:col-span-2">
                    <input {...text(account)} inputMode="numeric" placeholder="000 123 456" className={field} />
                  </Label>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <Toggle name="showGiftQr" checked={s.showGiftQr} onChange={(v) => set("showGiftQr", v)} label={t.bShowGiftQr} />
            </div>
          </div>

          {/* 6. Design (template, title, music; colors/font/background are in Design Settings below) */}
          <div hidden={tab !== "design"} className="space-y-4">
            <div>
              <span className="mb-1.5 block text-xs text-stone-500">{t.templates}</span>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => pickTemplate(tpl.id)}
                    className={`rounded-lg border p-1.5 text-[11px] transition ${
                      s.template === tpl.id ? "border-amber-500 ring-2 ring-amber-200" : "border-stone-200 hover:border-amber-200"
                    }`}
                  >
                    {tpl.id === "royal" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static template art
                      <img src="/templates/royal/cover-light.jpg?v=3" alt="" className="mb-1 aspect-[3/4] w-full rounded object-cover" />
                    ) : tpl.id === "olive" ? (
                      <span className="mb-1 flex aspect-[3/4] items-center justify-center rounded border border-[#a5a24a] bg-[#f2eedb] text-lg text-[#7d7a28]">
                        ❦
                      </span>
                    ) : tpl.id === "lotus" ? (
                      <span className="mb-1 flex aspect-[3/4] items-end justify-center rounded border border-[#c9a45c] bg-[repeating-linear-gradient(45deg,#e2c98f_0_6px,#d8b977_6px_12px)] p-1.5">
                        <span className="flex h-4/5 w-full items-end justify-center rounded-t-full bg-[#fff8ee] pb-2 text-lg text-[#a9843f] shadow-[0_0_0_2px_#f6e7c3]">
                          ❀
                        </span>
                      </span>
                    ) : tpl.id === "petal" ? (
                      <span className="mb-1 flex aspect-[3/4] items-center justify-center rounded bg-gradient-to-b from-pink-100 via-[#fbf6ee] to-amber-100 text-xl">
                        🌸
                      </span>
                    ) : (
                      <span
                        className="mb-1 flex aspect-[3/4] items-center justify-center rounded text-base font-bold"
                        style={{
                          background:
                            "linear-gradient(#ffe1e7,#fff5f7)",
                          color: tpl.colors.titleBottom,
                        }}
                      >
                        ♥
                      </span>
                    )}
                    {tpl.name[s.lang]}
                  </button>
                ))}
              </div>
            </div>
            <Toggle name="titleEnabled" checked={s.titleEnabled} onChange={(v) => set("titleEnabled", v)} label={t.showTitle} />
            {!isRoyal && s.template !== "petal" && s.template !== "olive" && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-stone-600">
                  {(
                    [
                      ["titleTop", t.colorTop],
                      ["titleBottom", t.colorBottom],
                      ["titleOutline", t.colorOutline],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer flex-col items-center gap-1">
                      <input
                        type="color"
                        value={s[key]}
                        onChange={(e) => set(key, e.target.value.toUpperCase())}
                        className="size-10 cursor-pointer appearance-none rounded-full border-2 border-white bg-transparent shadow ring-1 ring-stone-200 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setS((prev) => ({ ...prev, ...templateById(prev.template).colors }))}
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#a8782b]"
                >
                  <RotateCcw className="size-3.5" />
                  {t.resetColors}
                </button>
              </div>
            )}
            <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <Music2 className="size-4 text-[#a8782b]" />
                {t.music}
              </p>
              <div className="flex items-center gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm">
                <span className="truncate text-stone-700">{music.name ?? t.noMusic}</span>
                {music.url && (
                  <button
                    type="button"
                    aria-label={t.removeMusic}
                    onClick={() => {
                      if (musicInput.current) musicInput.current.value = "";
                      setMusic({ url: null, name: null });
                      setRemoveMusic(true);
                    }}
                    className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-stone-500 hover:text-red-600"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {music.url && <audio key={music.url} src={music.url} controls preload="none" className="h-10 w-full" />}
              <button type="button" onClick={() => musicInput.current?.click()} className={softBtn}>
                <Upload className="size-3.5" />
                {t.uploadMusic}
              </button>
              <input
                ref={musicInput}
                type="file"
                name="music"
                accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setMusic({ url: URL.createObjectURL(f), name: f.name });
                  setRemoveMusic(false);
                }}
              />
              <p className="text-xs text-stone-500">{t.musicHint}</p>
            </div>
          </div>

          {state?.error && (
            <div className="mt-4">
              <ErrorText>{state.error}</ErrorText>
            </div>
          )}
          <div className="mt-5">
            <SubmitButton className={goldBtn}>{t.bSaveAndPreview}</SubmitButton>
            {showSaved && <p className="mt-2 text-center text-sm text-emerald-600">{state?.message}</p>}
          </div>
        </div>

        {/* Live preview */}
        <div className={panel}>
          <CardTitle icon={<Smartphone className="size-4" />} title={t.bLivePreview} hint={t.bLivePreviewHint} />
          <div className="flex justify-center py-2">
            <div className="w-full max-w-[300px] rounded-[2.4rem] border-[9px] border-stone-900 bg-stone-900 shadow-xl">
              <div className="h-[560px] overflow-y-auto overflow-x-hidden rounded-[1.8rem] [scrollbar-width:none]">
                <InvitationView data={preview} heroClassName="min-h-[540px]" idPrefix="p-" />
              </div>
            </div>
          </div>
        </div>

        {/* Design settings */}
        <div className={panel}>
          <CardTitle icon={<LayoutTemplate className="size-4" />} title={t.bDesignSettings} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-xs text-stone-500">{t.bThemeColor}</span>
                <div className="flex flex-wrap items-center gap-3">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name[s.lang]}
                      aria-label={c.name[s.lang]}
                      onClick={() => set("themeColor", c.value)}
                      className={`size-8 rounded-full transition ${
                        s.themeColor === c.value ? "ring-2 ring-[#b8862f] ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => photoInputs.current.BACKGROUND?.click()}
                className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-stone-200 p-3"
              >
                <span className="flex w-full items-center justify-center gap-2 rounded-md bg-[#f6efe2] py-4 text-sm text-stone-600">
                  <Upload className="size-4" />
                  {t.uploadOwnImage}
                </span>
              </button>
              {photoInput("BACKGROUND", () => set("background", "custom"))}
            </div>
            <div className="space-y-4">
              <Label text={t.fontStyle}>
                <select
                  name="fontStyle"
                  value={s.fontStyle}
                  onChange={(e) => set("fontStyle", e.target.value)}
                  className={field}
                >
                  {FONT_STYLES.map((f) => (
                    <option key={f} value={f}>
                      {t[`font_${f}`]}
                    </option>
                  ))}
                </select>
              </Label>
              <div>
                <span className="mb-1.5 block text-xs text-stone-500">{t.bgImage}</span>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {BACKGROUNDS.filter((b) => b !== "custom" || photos.BACKGROUND).map((b) => (
                    <button
                      key={b}
                      type="button"
                      title={t[`bg_${b}`]}
                      aria-label={t[`bg_${b}`]}
                      onClick={() => set("background", b)}
                      className={`relative h-20 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        s.background === b ? "border-[#b8862f] shadow-md" : "border-stone-200 hover:border-amber-300"
                      }`}
                    >
                      <BackgroundSwatch kind={b} customUrl={photos.BACKGROUND} />
                    </button>
                  ))}
                </div>
                {s.background === "custom" && photos.BACKGROUND && (
                  <button
                    type="button"
                    onClick={() => {
                      clearPhoto("BACKGROUND");
                      set("background", "temple");
                    }}
                    className="mt-1 text-xs text-stone-500 hover:text-red-600"
                  >
                    {t.bRemove}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview link + publish */}
        <div className={panel}>
          <p className="mb-3 font-semibold text-stone-800">{t.bPreviewLink}</p>
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#f6efe2] text-[#a8782b]">
              <Link2 className="size-5" />
            </span>
            {s.published && origin ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input readOnly value={shareUrl} aria-label={t.shareLink} className={`${field} truncate text-xs`} />
                <button
                  type="button"
                  className={softBtn}
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? t.copied : t.copy}
                </button>
                <a href={`/i/${shareId}`} target="_blank" rel="noopener" className={softBtn} title={t.openLink}>
                  <ExternalLink className="size-4" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-stone-500">{t.previewLinkHint}</p>
            )}
          </div>
          {s.published && initial.published && (
            <div className="mt-3">
              <TelegramShareButton
                path={`/i/${shareId}`}
                label={t.shareTelegram}
                text={t.tgInviteText.replace("{couple}", `${s.groomName} & ${s.brideName}`)}
              />
            </div>
          )}
          <div className="mt-3 border-t border-stone-100 pt-2">
            <Toggle name="published" checked={s.published} onChange={(v) => set("published", v)} label={t.publish} />
            <p className="text-xs text-stone-500">{t.guestLinkHint}</p>
          </div>
        </div>
      </div>
    </form>
  );
}

/** Thumbnails for the background presets */
function BackgroundSwatch({ kind, customUrl }: { kind: string; customUrl: string | null }) {
  if (kind === "temple") {
    // eslint-disable-next-line @next/next/no-img-element -- static template art
    return <img src="/templates/royal/cover-light.jpg?v=3" alt="" className="size-full object-cover" />;
  }
  if (kind === "floral") {
    // eslint-disable-next-line @next/next/no-img-element -- static template art
    return <img src="/templates/royal/corner-flowers.png" alt="" className="size-full object-cover" />;
  }
  if (kind === "custom" && customUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user upload
    return <img src={customUrl} alt="" className="size-full object-cover" />;
  }
  const style =
    kind === "damask"
      ? {
          backgroundColor: "#fdfaf3",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cg fill='none' stroke='%23b8862f' stroke-opacity='.35'%3E%3Cpath d='M16 3c4 4 4 9 0 13-4-4-4-9 0-13zM16 16c4 4 4 9 0 13-4-4-4-9 0-13zM3 16c4-4 9-4 13 0-4 4-9 4-13 0zM16 16c4-4 9-4 13 0-4 4-9 4-13 0z'/%3E%3C/g%3E%3C/svg%3E\")",
        }
      : {
          backgroundColor: "#f8e4cc",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 4 17 12 12 20 7 12Z' fill='none' stroke='%23b8862f' stroke-opacity='.45'/%3E%3C/svg%3E\")",
        };
  return <span className="block size-full" style={style} />;
}
