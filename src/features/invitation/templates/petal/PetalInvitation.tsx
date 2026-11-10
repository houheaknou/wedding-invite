"use client";

import { useActionState, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { GiftQr, giftQrTitle, hasGiftQr } from "@/features/invitation/templates/GiftQr";
import { CalendarHeart, Camera, ChevronsUp, Frown, Hand, Heart, House, Link2, MapPin, MessageCircleHeart, Music, PenLine, Phone, Send, Users, VolumeX, X } from "lucide-react";
import { submitRsvp, type RsvpState } from "@/features/invitation/rsvp-actions";
import { parseAgenda } from "@/features/invitation/agenda";
import { royalFontVars } from "@/features/invitation/fonts";
import { formatInviteDate, INVITE_TEXT, type InvitationData, type InviteLang, mapEmbedSrc, contactPhoneList } from "@/features/invitation/shared";
import s from "./petal.module.css";
import { TelegramIcon } from "@/components/TelegramIcon";

const T = {
  km: {
    invited: "សូមគោរពអញ្ជើញ",
    dearGuest: "ភ្ញៀវកិត្តិយស",
    scroll: "សូមអូសចុះក្រោម",
    sound: "ចុចដើម្បីបើកសម្លេង",
    soundOn: "កំពុងចាក់តន្ត្រី",
    groom: "កូនប្រុស",
    bride: "កូនស្រី",
    groomParents: "មាតាបិតាខាងកូនប្រុស",
    brideParents: "មាតាបិតាខាងកូនស្រី",
    wordingTitle: "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ",
    month: "ខែ",
    time: "ម៉ោង",
    countdown: "ចំនួនថ្ងៃរាប់ថយក្រោយ",
    units: ["ថ្ងៃ", "ម៉ោង", "នាទី", "វិនាទី"],
    calendar: "កត់ចូលក្នុងប្រតិទិនរបស់អ្នក",
    programme: "កម្មវិធីពិធី",
    venue: "ទីតាំងកម្មវិធី",
    contact: "ទំនាក់ទំនង",
    map: "មើលក្នុង Google Map",
    gallery: "កម្រងរូបភាព",
    wishes: "សារជូនពរ",
    confirm: "បញ្ជាក់ការចូលរួម",
    name: "ឈ្មោះរបស់អ្នក",
    phone: "លេខទូរស័ព្ទ",
    people: "ចំនួនមនុស្ស",
    persons: "នាក់",
    attend: "ចូលរួម",
    absent: "មិនបាន",
    message: "សរសេរសារជូនពរ…",
    quickWishes: ["សូមជូនពរឲ្យមានសុភមង្គល 💐", "រីករាយពិធីមង្គលការ 🎉", "ស្រឡាញ់គ្នារហូត 💕"],
    send: "ផ្ញើ",
    sent: "សូមអរគុណ! យើងបានទទួលការឆ្លើយតប និងសារជូនពររបស់អ្នក។",
    errName: "សូមបញ្ចូលឈ្មោះ",
    errPhone: "សូមបញ្ចូលលេខទូរស័ព្ទ",
    errClosed: "ការឆ្លើយតបត្រូវបានបិទ",
    errLimit: "ផ្ញើច្រើនដងពេក សូមព្យាយាមម្តងទៀតពេលក្រោយ",
    preview: "មើលជាមុន — ទម្រង់នេះដំណើរការនៅលើតំណដែលបានចែករំលែក។",
    thanks: "សូមអរគុណចំពោះការចូលរួមក្នុងថ្ងៃដ៏មានន័យរបស់យើង",
    thanksSub: "Thank you for being a part of our special day!",
    nav: ["ទំព័រដើម", "ទីតាំង", "រូបភាព", "ប្រតិទិន", "សារជូនពរ", "ឡើងលើ"],
  },
  en: {
    invited: "Kindly invited",
    dearGuest: "Dear Guest",
    scroll: "Scroll down",
    sound: "Tap to turn on sound",
    soundOn: "Music playing",
    groom: "Groom",
    bride: "Bride",
    groomParents: "Parents of the groom",
    brideParents: "Parents of the bride",
    wordingTitle: "We joyfully invite you",
    month: "",
    time: "At",
    countdown: "Counting down",
    units: ["Days", "Hours", "Min", "Sec"],
    calendar: "Add to your calendar",
    programme: "Programme",
    venue: "Venue",
    contact: "Contact",
    map: "Open in Google Maps",
    gallery: "Gallery",
    wishes: "Wishes",
    confirm: "Will you attend?",
    name: "Your name",
    phone: "Phone number",
    people: "People",
    persons: "",
    attend: "Attending",
    absent: "Can't come",
    message: "Write your wishes…",
    quickWishes: ["Congratulations! 💐", "Happy wedding day 🎉", "Love you both 💕"],
    send: "Send",
    sent: "Thank you! We've received your reply and wishes.",
    errName: "Please enter your name",
    errPhone: "Please enter your phone number",
    errClosed: "RSVP is closed",
    errLimit: "Too many replies — please try again later",
    preview: "Preview — the form works on the shared link.",
    thanks: "Thank you for being a part of our special day!",
    thanksSub: "",
    nav: ["Home", "Venue", "Gallery", "Calendar", "Wishes", "Top"],
  },
};

const KM_DIGITS = "០១២៣៤៥៦៧៨៩";
const km = (v: string | number) => String(v).replace(/\d/g, (d) => KM_DIGITS[Number(d)]);
const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const KM_DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Fixed petal layout (deterministic so server and client render the same markup)
const PETALS = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 37 + 5) % 100,
  size: 8 + ((i * 7) % 6),
  dur: 9 + ((i * 5) % 8),
  delay: -((i * 13) % 17),
  drift: ((i % 2 ? 1 : -1) * (20 + ((i * 11) % 60))),
}));

/** Drawn gold flower wreath for the hero when there's no photo */
function Wreath() {
  const leaves = Array.from({ length: 18 }, (_, i) => (i * 360) / 18);
  return (
    <svg className={s.wreath} viewBox="0 0 260 260" aria-hidden>
      <circle cx="130" cy="130" r="96" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <circle cx="130" cy="130" r="88" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".35" />
      {leaves.map((deg, i) => (
        <g key={deg} transform={`rotate(${deg} 130 130)`}>
          <path d="M130 30c7 6 8 14 0 20-8-6-7-14 0-20z" fill="currentColor" opacity={i % 2 ? 0.55 : 0.8} />
          {i % 3 === 0 && (
            <g transform="translate(130 40)">
              <circle r="6" fill="#f6c3cf" />
              <circle r="2.4" fill="#e8a23c" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Cambodia-time date pieces for the big date block */
function parts(iso: string, lang: InviteLang) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const h = d.getUTCHours();
  const hm = `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return lang === "km"
    ? {
        month: `ខែ${KM_MONTHS[d.getUTCMonth()]}`,
        weekday: `ថ្ងៃ${KM_DAYS[d.getUTCDay()]}`,
        day: km(d.getUTCDate()),
        time: `ម៉ោង ${km(d.getUTCMinutes() ? hm : h % 12 || 12)} ${h < 12 ? "ព្រឹក" : h < 17 ? "រសៀល" : "ល្ងាច"}`,
        year: km(d.getUTCFullYear()),
      }
    : {
        month: EN_MONTHS[d.getUTCMonth()],
        weekday: EN_DAYS[d.getUTCDay()],
        day: String(d.getUTCDate()),
        time: `${hm} ${h < 12 ? "AM" : "PM"}`,
        year: String(d.getUTCFullYear()),
      };
}

/** Google Calendar "add event" link (4-hour slot) */
function calendarUrl(data: InvitationData) {
  const start = new Date(data.startsAt);
  const end = new Date(start.getTime() + 4 * 3600_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${data.groomName} & ${data.brideName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: [data.venueEn ?? data.venue, data.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function useReveal(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const host = root.current;
    const els = host?.querySelectorAll(`.${s.reveal}`);
    if (!host || !els?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        // The first callback always arrives right after observe(); only now is it safe to hide content
        host.classList.add(s.ready);
        entries.forEach((e) => e.isIntersecting && e.target.classList.add(s.in));
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

/** One-line headline: shrinks the font until the text fits the width, so long titles never wrap */
function FitLine({ as: Tag = "h1", className, children }: { as?: "h1" | "h2"; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const max = parseFloat(getComputedStyle(el).fontSize);
      if (el.scrollWidth > el.clientWidth) el.style.fontSize = `${Math.max(14, (max * el.clientWidth) / el.scrollWidth - 0.5)}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [children]);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Single-stroke outline heart with a little overshoot at the end, like a pen drawing */
function DrawnHeart({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 36 32" width="30" height="27" aria-hidden>
      <path
        d="M18 29C9 22 3.5 16 5 10.5 6.4 5.6 12.6 4.4 16.6 9.6 17.3 10.6 17.8 11.6 18 12.4 19.4 7.4 23.6 4.6 27.7 5.6 32.6 7 33.6 13.4 29.2 18.6 26.6 21.8 22.6 25.2 18 29 15.8 27.2 14 25.4 13.4 24.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gold rule: fading lines, dots and diamonds, a small four-petal flower in the middle */
function Ornament({ className }: { className: string }) {
  const side = (
    <>
      <path d="M8 10H74" stroke="url(#orn-fade)" strokeWidth="1" />
      <circle cx="78" cy="10" r="1.3" />
      <path d="M84 10l3.2-3.2 3.2 3.2-3.2 3.2z" />
      <circle cx="94.5" cy="10" r="1" />
    </>
  );
  return (
    <svg className={className} viewBox="0 0 240 20" width="220" height="18" fill="currentColor" aria-hidden>
      <defs>
        <linearGradient id="orn-fade" x1="8" x2="74" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      {side}
      <g transform="matrix(-1 0 0 1 240 0)">{side}</g>
      <g transform="translate(120 10)">
        {[0, 90, 180, 270].map((r) => (
          <path key={r} transform={`rotate(${r})`} d="M0 0C-3.2-2.4-3.2-7 0-8.6 3.2-7 3.2-2.4 0 0z" />
        ))}
        <circle r="1.6" fill="#fff8e6" />
      </g>
    </svg>
  );
}

function Countdown({ iso, t, lang }: { iso: string; t: (typeof T)["km"]; lang: InviteLang }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = now === null ? null : Math.max(0, new Date(iso).getTime() - now);
  const vals = left === null ? null : [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
  const num = (v: number) => (lang === "km" ? km(String(v).padStart(2, "0")) : String(v).padStart(2, "0"));
  return (
    <p className={s.count} suppressHydrationWarning>
      {t.units.map((u, i) => (
        <span key={u}>
          <b>{vals ? num(vals[i]) : "--"}</b> {u}
        </span>
      ))}
    </p>
  );
}

/** Section heading in the ornate gold style, with the small flourish under it */
function SectionHead({ children, heart = false }: { children: React.ReactNode; heart?: boolean }) {
  return (
    <div className={s.head}>
      <h2 className={s.gTitle}>
        {heart && <Heart className={s.headHeart} size={13} fill="currentColor" aria-hidden />}
        {children}
      </h2>
      <Ornament className={s.headOrnament} />
    </div>
  );
}

function Wishes({ data, t }: { data: InvitationData; t: (typeof T)["km"] }) {
  const target = data.rsvp;
  const [state, action, pending] = useActionState<RsvpState, FormData>(
    target ? submitRsvp.bind(null, target.shareId, target.guestId) : async () => undefined,
    undefined,
  );
  // Inside the builder the preview sits in the builder's <form>: plain, unnamed, non-required fields
  const n = (name: string) => (target ? name : undefined);
  const err =
    state?.error === "name" ? t.errName : state?.error === "phone" ? t.errPhone : state?.error === "limit" ? t.errLimit : state?.error ? t.errClosed : null;
  const [answer, setAnswer] = useState<"YES" | "NO">("YES");
  const [count, setCount] = useState(1);
  const [message, setMessage] = useState("");
  const num = (c: number) => (data.lang === "km" ? km(c) : String(c));
  const addWish = (w: string) => setMessage((m) => (m.includes(w) ? m : m ? `${m.trimEnd()} ${w}` : w));
  const fields = (
    <>
      {target && <input className={s.hp} name="website" tabIndex={-1} autoComplete="off" aria-hidden />}
      {/* attend / can't come: two little cards */}
      <div className={s.choices}>
        {(["YES", "NO"] as const).map((a) => (
          <label key={a} className={s.choice}>
            <input
              type="radio"
              name={target ? "answer" : `petal-preview-${data.lang}`}
              value={a}
              checked={answer === a}
              onChange={() => setAnswer(a)}
            />
            <span>
              <i aria-hidden>{a === "YES" ? <Heart size={14} fill="currentColor" /> : <Frown size={15} />}</i>
              {a === "YES" ? t.attend : t.absent}
              <b className={s.tick} aria-hidden>
                ✓
              </b>
            </span>
          </label>
        ))}
      </div>
      {/* head count stepper (hidden when not coming) */}
      {answer === "YES" ? (
        <div className={s.stepper}>
          <span className={s.stepLabel}>
            <Users size={16} aria-hidden />
            {t.people}
          </span>
          {/* one or two guests per reply: a two-way switch with a sliding knob */}
          <div className={`${s.duo} ${count === 2 ? s.duoTwo : ""}`} role="radiogroup" aria-label={t.people}>
            {[1, 2].map((c) => (
              <button key={c} type="button" role="radio" aria-checked={count === c} onClick={() => setCount(c)}>
                {num(c)} {t.persons}
              </button>
            ))}
          </div>
          <input type="hidden" name={n("count")} value={count} />
        </div>
      ) : (
        <input type="hidden" name={n("count")} value={1} />
      )}
      {/* wish card + quick wishes */}
      <div className={s.wishCard}>
        <span className={s.wishIcon} aria-hidden>
          <PenLine size={15} />
        </span>
        <textarea name={n("message")} rows={3} placeholder={t.message} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className={s.chips}>
          {t.quickWishes.map((w) => (
            <button key={w} type="button" onClick={() => addWish(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>
      <div>
        <button className={s.ribbonBtn} type={target ? "submit" : "button"} disabled={pending || state?.ok}>
          <Send size={16} />
          {state?.ok ? "✓" : t.send}
        </button>
      </div>
      {state?.ok && <p className={s.formMsg}>{t.sent}</p>}
      {err && <p className={`${s.formMsg} ${s.err}`}>{err}</p>}
      {!target && <p className={s.formMsg}>{t.preview}</p>}
    </>
  );
  return target ? (
    <form action={action} className={s.form}>
      {fields}
    </form>
  ) : (
    <div className={s.form}>{fields}</div>
  );
}

export function PetalInvitation({
  data,
  heroClassName = "min-h-svh",
  autoPlayOnTap = false,
  idPrefix = "r-",
  thumbnail = false,
}: {
  data: InvitationData;
  heroClassName?: string;
  autoPlayOnTap?: boolean;
  idPrefix?: string;
  thumbnail?: boolean;
}) {
  const [lang, setLang] = useState<InviteLang>(data.lang);
  const t = T[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  // music: pill at the top; on the public page it also starts on the visitor's first tap
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);
  useEffect(() => {
    if (!autoPlayOnTap || !data.musicUrl) return;
    const start = () => {
      if (!userPaused.current) audio.current?.play().catch(() => {});
    };
    window.addEventListener("pointerdown", start, { once: true });
    return () => window.removeEventListener("pointerdown", start);
  }, [autoPlayOnTap, data.musicUrl]);

  const [zoom, setZoom] = useState<string | null>(null);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const p = parts(data.startsAt, lang);
  const days = parseAgenda(data.agenda).filter((d) => d.items.length);
  const mapQuery = [data.venueEn ?? data.venue, data.address].filter(Boolean).join(", ");
  const mapHref = data.mapUrl ?? (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null);
  const mapSrc = mapEmbedSrc(data);
  // "Contact phones" from the editor (one per line), shown as tap-to-call buttons under the venue
  const phones = contactPhoneList(data.contactPhones);
  const id = (x: string) => `${idPrefix}${x}`;
  // Hero photo: the cover, else the first gallery photo, else a couple portrait
  const heroPhoto = data.coverUrl ?? data.galleryUrls[0] ?? data.groomPhotoUrl ?? data.bridePhotoUrl;
  // The gallery block is one row of two; skip whatever the hero already shows
  const photos = (
    data.galleryUrls.length
      ? data.galleryUrls
      : [data.coverUrl, data.groomPhotoUrl, data.bridePhotoUrl, data.venuePhotoUrl].filter((u): u is string => !!u)
  )
    .filter((u) => u !== heroPhoto)
    .slice(0, 2);
  // Khmer names in Khmer mode (English as a fallback), and the other way round
  const [groom, bride] =
    lang === "en"
      ? [data.groomNameEn || data.groomName, data.brideNameEn || data.brideName]
      : [data.groomName || data.groomNameEn || "", data.brideName || data.brideNameEn || ""];
  // parents (one name per line in the builder): the current language first, the other as a fallback
  const [groomParents, brideParents] =
    lang === "en"
      ? [data.groomParentsEn || data.groomParents, data.brideParentsEn || data.brideParents]
      : [data.groomParents || data.groomParentsEn, data.brideParents || data.brideParentsEn];
  const heroTitle = (lang === "en" ? data.titleEn : data.title) || INVITE_TEXT[lang].title;
  const share = (base: string) => () => window.open(base + encodeURIComponent(window.location.href), "_blank", "noopener");

  return (
    <div
      ref={rootRef}
      className={`${s.root} ${royalFontVars}`}
      // headline gold gradient + outline come from the builder's title colors
      style={{ "--gold": data.themeColor, "--t-top": data.titleTop, "--t-bottom": data.titleBottom, "--t-outline": data.titleOutline } as CSSProperties}
    >
      {/* falling petals */}
      <div className={s.petals} aria-hidden hidden={thumbnail}>
        <div>
          {PETALS.map((pt, i) => (
            <span
              key={i}
              className={s.petal}
              style={
                {
                  left: `${pt.left}%`,
                  "--size": `${pt.size}px`,
                  "--dur": `${pt.dur}s`,
                  "--delay": `${pt.delay}s`,
                  "--drift": `${pt.drift}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* top controls: language switch + sound */}
      <div className={s.topBar} hidden={thumbnail}>
        <button type="button" className={s.langSwitch} onClick={() => setLang(lang === "km" ? "en" : "km")} aria-label="ខ្មែរ / EN">
          ខ្មែរ <span className={`${s.knob} ${lang === "en" ? s.en : ""}`} /> EN
        </button>
        {data.musicUrl && (
          <button
            type="button"
            className={`${s.soundPill} ${playing ? s.on : ""}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              const a = audio.current;
              if (!a) return;
              if (a.paused) {
                userPaused.current = false;
                a.play().catch(() => {});
              } else {
                userPaused.current = true;
                a.pause();
              }
            }}
          >
            {playing ? t.soundOn : t.sound} <Music size={14} />
            <span className={s.mute}>{playing ? <Music size={14} /> : <VolumeX size={14} />}</span>
            <audio ref={audio} src={data.musicUrl} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
          </button>
        )}
      </div>

      {/* hero */}
      <section id={id("home")} className={`${s.hero} ${heroPhoto ? "" : s.noPhoto} ${heroClassName}`}>
        {heroPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- user upload
          <img src={heroPhoto} alt="" />
        ) : (
          <div className={s.heroFallback}>
            {/* no photo yet: a drawn wreath with the title and names instead of an empty block */}
            <div className={s.wreathBox}>
              <Wreath />
              <div className={s.wreathText}>
                {data.titleEnabled && <p className={s.gTitle}>{data.title || "សិរីមង្គលអាពាហ៍ពិពាហ៍"}</p>}
                <p className={s.heroNames}>
                  {data.groomName}
                  <Heart className={s.heart} size={22} strokeWidth={1.6} />
                  {data.brideName}
                </p>
                {(data.groomNameEn || data.brideNameEn) && (
                  <p className={s.coupleEn}>
                    {data.groomNameEn} &amp; {data.brideNameEn}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {heroPhoto && (
          <div className={s.heroTop}>
            {data.titleEnabled && <FitLine className={`${s.ornate} ${s.heroTitle}`}>{heroTitle}</FitLine>}
            <p className={`${s.ornate} ${s.heroCouple}`}>
              {groom}
              <small>{lang === "en" ? "&" : "និង"}</small>
              {bride}
            </p>
          </div>
        )}
        <div className={s.heroBody}>
          <p className={s.invitedRow}>
            <Heart size={11} fill="currentColor" aria-hidden />
            <span className={`${s.ornate} ${s.ornateSm} ${s.invited}`}>{t.invited}</span>
            <Heart size={11} fill="currentColor" aria-hidden />
          </p>
          <div className={s.banner}>
            <b>{data.guestName || t.dearGuest}</b>
          </div>
          <p className={s.heroDatePill}>
            <span className={`${s.ornate} ${s.ornateSm} ${s.heroDate}`} suppressHydrationWarning>
              {formatInviteDate(data.startsAt, lang)}
            </span>
          </p>
          <a className={s.scrollHint} href={`#${id("invitation")}`}>
            <Hand size={17} />
            <span>
              {T.km.scroll}
              <small>Scroll down</small>
            </span>
          </a>
        </div>
      </section>

      {/* couple + wording */}
      <section id={id("invitation")} className={s.section}>
        <div className={`${s.couple} ${s.reveal}`}>
          <div>
            <p className={s.role}>{t.groom}</p>
            <p className={s.coupleName}>{groom}</p>
            {data.groomNameEn && <p className={s.coupleEn}>{data.groomNameEn}</p>}
          </div>
          <DrawnHeart className={s.heart} />
          <div>
            <p className={s.role}>{t.bride}</p>
            <p className={s.coupleName}>{bride}</p>
            {data.brideNameEn && <p className={s.coupleEn}>{data.brideNameEn}</p>}
          </div>
        </div>
        {data.showParents && (groomParents || brideParents) && (
          <div className={`${s.parents} ${s.reveal}`}>
            <div>
              <p className={s.parentsRole}>{t.groomParents}</p>
              <p className={s.parentsNames}>{groomParents}</p>
            </div>
            <span className={s.parentsRule} aria-hidden />
            <div>
              <p className={s.parentsRole}>{t.brideParents}</p>
              <p className={s.parentsNames}>{brideParents}</p>
            </div>
          </div>
        )}
        <div className={s.reveal} style={{ marginTop: 22 }}>
          <FitLine as="h2" className={`${s.gTitle} ${s.oneLine}`}>
            {t.wordingTitle}
          </FitLine>
          <p className={s.wording}>{data.message || INVITE_TEXT[lang].message}</p>
          <Ornament className={s.ornament} />
        </div>
      </section>

      {/* date + countdown + calendar + programme */}
      <section id={id("programme")} className={s.section}>
        <div className={s.reveal} suppressHydrationWarning>
          <p className={s.month}>{p.month}</p>
          <div className={s.dateRow}>
            <span>{p.weekday}</span>
            <b className={s.bigDay}>{p.day}</b>
            <span>{p.time}</span>
          </div>
          <p className={s.year}>{p.year}</p>
        </div>
        {data.showCountdown && (
          <div className={`${s.reveal} ${s.block}`}>
            <SectionHead heart>{t.countdown}</SectionHead>
            <Countdown iso={data.startsAt} t={t} lang={lang} />
            <p className={s.congrats}>Congratulations!</p>
          </div>
        )}
        <a className={`${s.ribbonBtn} ${s.reveal}`} href={calendarUrl(data)} target="_blank" rel="noopener noreferrer">
          <CalendarHeart size={16} />
          {t.calendar}
        </a>
        {data.showAgenda && days.length > 0 && (
          <div className={`${s.reveal} ${s.block}`}>
            <SectionHead>{t.programme}</SectionHead>
            {days.map((day, i) => (
              <div key={i} className={s.day}>
                {(day.title || day.date) && <h3>{[day.title, day.date].filter(Boolean).join(" · ")}</h3>}
                <ul>
                  {day.items.map((it, j) => (
                    <li key={j}>
                      <b>{it.time}</b>
                      <span>{it.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* venue */}
      {data.showDetails && (mapQuery || mapHref || phones.length > 0) && (
        <section id={id("venue")} className={s.section}>
          <div className={s.reveal}>
            <SectionHead>{t.venue}</SectionHead>
            {(data.venue || data.venueEn) && <p className={s.venueName}>{lang === "en" ? data.venueEn || data.venue : data.venue || data.venueEn}</p>}
            {data.address && <p className={s.addr}>{data.address}</p>}
            {data.showMap && mapSrc ? (
              <div className={s.map}>
                <iframe title="map" loading="lazy" src={mapSrc ?? undefined} />
              </div>
            ) : (
              // a short maps.app.goo.gl link can't be embedded: show the venue photo instead when there is one
              data.venuePhotoUrl && (
                <button type="button" className={s.map} onClick={() => setZoom(data.venuePhotoUrl)} aria-label={t.venue}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user upload served by our own route */}
                  <img src={data.venuePhotoUrl} alt="" />
                </button>
              )
            )}
            {mapHref && (
              <a className={s.ribbonBtn} href={mapHref} target="_blank" rel="noopener noreferrer">
                <MapPin size={16} />
                {t.map}
              </a>
            )}
            {phones.length > 0 && (
              <div className={s.contact}>
                <p className={s.contactTitle}>{t.contact}</p>
                <div className={s.phones}>
                  {phones.map(({ label, tel }) => (
                    <a key={tel} href={`tel:${tel}`}>
                      <Phone size={14} />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ចំណងដៃ: bank KHQR (before the gallery, so guests find it straight after the venue) */}
      {hasGiftQr(data) && (
        <section id={id("gift")} className={s.section}>
          <div className={s.reveal}>
            <SectionHead>{giftQrTitle(lang)}</SectionHead>
            <GiftQr data={data} lang={lang} accent="#b07a45" />
          </div>
        </section>
      )}

      {/* gallery */}
      {photos.length > 0 && (
        <section id={id("gallery")} className={s.section}>
          <div className={s.reveal}>
            <SectionHead>{t.gallery}</SectionHead>
          </div>
          <div className={s.gallery}>
            {photos.map((src, i) => (
              <button key={src} type="button" className={s.reveal} style={{ transitionDelay: `${(i % 4) * 120}ms` }} onClick={() => setZoom(src)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* wishes / RSVP */}
      {data.showRsvp && (
        <section id={id("rsvp")} className={s.section}>
          <div className={s.reveal}>
            <SectionHead>{t.wishes}</SectionHead>
            <p className={s.sub}>{t.confirm}</p>
            <Wishes data={data} t={t} />
          </div>
        </section>
      )}

      {/* footer */}
      <footer id={id("footer")} className={s.footer}>
        <div className={s.reveal}>
          <Ornament className={s.ornament} />
          <p className={s.thanks} style={{ marginTop: 12 }}>
            {t.thanks} 💕
          </p>
          {t.thanksSub && <p className={s.thanksEn}>{t.thanksSub}</p>}
          <div className={s.share}>
            <button type="button" aria-label="Telegram" onClick={share("https://t.me/share/url?url=")}>
              <TelegramIcon size={16} />
            </button>
            <button type="button" aria-label="Facebook" onClick={share("https://www.facebook.com/sharer/sharer.php?u=")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.4.2-.5.5-.5z" />
              </svg>
            </button>
            <button type="button" aria-label="Copy link" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <Link2 size={16} />
            </button>
          </div>
        </div>
      </footer>

      {/* photo lightbox */}
      {zoom && (
        <div className={s.lightbox} role="dialog" aria-modal onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
          <img src={zoom} alt="" />
          <button type="button" aria-label="Close" onClick={() => setZoom(null)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* bottom dock + back to top */}
      <div className={s.dockWrap} hidden={thumbnail}>
        <nav className={s.dock} aria-label="sections">
          {(
            [
              ["home", House, t.nav[0]],
              ["venue", MapPin, t.nav[1]],
              ["gallery", Camera, t.nav[2]],
              ["programme", CalendarHeart, t.nav[3]],
              ["rsvp", MessageCircleHeart, t.nav[4]],
            ] as const
          ).map(([target, Icon, label]) => (
            <a key={target} href={`#${id(target)}`} aria-label={label} title={label}>
              <Icon size={19} />
            </a>
          ))}
        </nav>
        <a className={s.toTop} href={`#${id("home")}`} aria-label={t.nav[5]} title={t.nav[5]}>
          <ChevronsUp size={20} />
        </a>
      </div>
    </div>
  );
}
