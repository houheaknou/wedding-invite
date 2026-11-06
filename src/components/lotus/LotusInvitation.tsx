"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { GiftQr, giftQrTitle, hasGiftQr } from "@/components/GiftQr";
import { submitRsvp, type RsvpState } from "@/actions/rsvp";
import { MusicButton } from "@/components/MusicButton";
import { parseAgenda } from "@/lib/agenda";
import { lotusFontVars } from "@/lib/invite-fonts";
import { formatInviteDate, INVITE_TEXT, type InvitationData, type InviteLang, mapEmbedSrc } from "@/lib/invitation";
import s from "./lotus.module.css";

const T = {
  km: {
    nav: { invitation: "ធៀប", countdown: "រាប់ថយក្រោយ", programme: "កម្មវិធី", gallery: "រូបភាព", venue: "ទីតាំង", rsvp: "ឆ្លើយតប" },
    defaultTitle: "ធៀបការ",
    quick: { programme: "កម្មវិធីពិធី", venue: "ទីតាំង", gallery: "កម្រងរូបភាព", rsvp: "ឆ្លើយតប" },
    rsvpCta: "បញ្ជាក់ការចូលរួម",
    inviteTitle: "លិខិតអញ្ជើញ",
    respect: "សូមគោរពអញ្ជើញ",
    honor: "លោក លោកស្រី អ្នកនាង កញ្ញា",
    dearGuest: "ភ្ញៀវកិត្តិយស",
    groomParents: "មាតាបិតាខាងកូនប្រុស",
    brideParents: "មាតាបិតាខាងកូនស្រី",
    cdTitle: "រាប់ថយក្រោយដល់ថ្ងៃមង្គល",
    units: ["ថ្ងៃ", "ម៉ោង", "នាទី", "វិនាទី"],
    schTitle: "កម្មវិធីពិធីមង្គលការ",
    galTitle: "កម្រងរូបភាព",
    galHint: "ចុចលើរូបភាព ដើម្បីមើលទំហំធំ",
    locTitle: "ទីតាំងកម្មវិធី",
    venueL: "ទីកន្លែង",
    addrL: "អាសយដ្ឋាន",
    dateL: "កាលបរិច្ឆេទ",
    phoneL: "ទំនាក់ទំនង",
    directions: "បើកផែនទី",
    rsvpTitle: "បញ្ជាក់ការចូលរួម",
    rsvpIntro: "សូមជួយឆ្លើយតប ដើម្បីងាយស្រួលក្នុងការរៀបចំកន្លែងស្វាគមន៍។",
    nameL: "ឈ្មោះរបស់អ្នក",
    nameP: "សូមបញ្ចូលឈ្មោះ",
    phone: "លេខទូរស័ព្ទ",
    attendL: "តើអ្នកអាចចូលរួមបានទេ?",
    yes: "ចូលរួមដោយរីករាយ",
    no: "សូមអភ័យទោស មិនអាចចូលរួម",
    countL: "ចំនួនអ្នកចូលរួម",
    people: "នាក់",
    msgL: "ពាក្យជូនពរ",
    msgP: "សរសេរពាក្យជូនពរ…",
    submit: "ផ្ញើការឆ្លើយតប",
    errName: "សូមបញ្ចូលឈ្មោះ",
    errPhone: "សូមបញ្ចូលលេខទូរស័ព្ទ",
    errClosed: "ការឆ្លើយតបត្រូវបានបិទ",
    preview: "មើលជាមុន — ទម្រង់នេះដំណើរការនៅលើតំណដែលបានចែករំលែក។",
    thanks: "សូមអរគុណ!",
    done: "យើងបានទទួលការឆ្លើយតប និងពាក្យជូនពររបស់អ្នកហើយ។",
    footClose: "សូមអរគុណចំពោះវត្តមាន និងពរជ័យរបស់លោកអ្នក",
    top: "ឡើងលើ",
    open: "បើកធៀប",
    openHint: "ចុចដើម្បីបើកលិខិតអញ្ជើញ",
  },
  en: {
    nav: { invitation: "Invitation", countdown: "Countdown", programme: "Programme", gallery: "Gallery", venue: "Location", rsvp: "RSVP" },
    defaultTitle: "Wedding Invitation",
    quick: { programme: "Programme", venue: "Location", gallery: "Gallery", rsvp: "RSVP" },
    rsvpCta: "Confirm attendance",
    inviteTitle: "Your Invitation",
    respect: "Cordially inviting",
    honor: "Mr. / Mrs. / Ms.",
    dearGuest: "Honoured Guest",
    groomParents: "Parents of the groom",
    brideParents: "Parents of the bride",
    cdTitle: "Counting down to our day",
    units: ["Days", "Hours", "Minutes", "Seconds"],
    schTitle: "Wedding Programme",
    galTitle: "Our Gallery",
    galHint: "Tap a photo to view it larger",
    locTitle: "Location",
    venueL: "Venue",
    addrL: "Address",
    dateL: "Date & time",
    phoneL: "Contact",
    directions: "Get directions",
    rsvpTitle: "Kindly Reply",
    rsvpIntro: "Please let us know if you can join us, so we can prepare your welcome.",
    nameL: "Your name",
    nameP: "Enter your name",
    phone: "Phone number",
    attendL: "Will you attend?",
    yes: "Joyfully accepts",
    no: "Regretfully declines",
    countL: "Number of guests",
    people: "",
    msgL: "Your wishes",
    msgP: "Write your wishes…",
    submit: "Send reply",
    errName: "Please enter your name",
    errPhone: "Please enter your phone number",
    errClosed: "RSVP is closed",
    preview: "Preview — the form works on the shared link.",
    thanks: "Thank you!",
    done: "We've received your reply and your wishes.",
    footClose: "Thank you for your presence and your blessings",
    top: "Back to top",
    open: "Open Invitation",
    openHint: "Tap to open your invitation",
  },
};
type Dict = (typeof T)["km"];

const KM_DIGITS = "០១២៣៤៥៦៧៨៩";
const num = (v: string | number, lang: InviteLang) => (lang === "km" ? String(v).replace(/\d/g, (d) => KM_DIGITS[Number(d)]) : String(v));

/** "21 · 02 · 2027" in Cambodia time */
function dotDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())} · ${p(d.getUTCMonth() + 1)} · ${d.getUTCFullYear()}`;
}

/** Scalloped rosette (the photo frame): `lobes` arcs bulging out between valleys at rIn */
function rosette(cx: number, cy: number, rOut: number, rIn: number, lobes = 8) {
  const step = (Math.PI * 2) / lobes;
  const half = step / 2;
  const chord = 2 * rIn * Math.sin(half);
  const sag = rOut - rIn * Math.cos(half);
  const r = (chord * chord) / 4 / (2 * sag) + sag / 2;
  const pt = (i: number) => {
    const a = i * step - Math.PI / 2 - half;
    return `${(cx + rIn * Math.cos(a)).toFixed(1)} ${(cy + rIn * Math.sin(a)).toFixed(1)}`;
  };
  let d = `M${pt(0)}`;
  for (let i = 1; i <= lobes; i++) d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pt(i)}`;
  return `${d}Z`;
}
const FRAME_OUT = rosette(200, 200, 186, 172);
const FRAME_IN = rosette(200, 200, 164, 152);

// Fixed petal layout (deterministic so server and client render the same markup)
const PETALS = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 41 + 7) % 98,
  size: 10 + ((i * 7) % 10),
  dur: 11 + ((i * 5) % 9),
  delay: -((i * 13) % 18),
  opacity: 0.5 + ((i * 3) % 7) / 20,
}));
const GARLANDS = [
  { cls: s.g1, beads: 10 },
  { cls: s.g2, beads: 7 },
  { cls: s.g3, beads: 10 },
  { cls: s.g4, beads: 7 },
];
const TILE_SHAPES = [s.arA, s.arB, s.arC, s.arA, s.arB, s.arC];

/** Shared drawings (lotus, crown, kbach line, jasmine…), referenced with <use> */
function Defs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="ltPetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAE6DA" />
          <stop offset="1" stopColor="#EACFA8" />
        </linearGradient>
        <linearGradient id="ltPetal2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6DCCF" />
          <stop offset="1" stopColor="#E7C6B2" />
        </linearGradient>
        <linearGradient id="ltGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4C98F" />
          <stop offset=".5" stopColor="#C9A45C" />
          <stop offset="1" stopColor="#A9843F" />
        </linearGradient>
        <linearGradient id="ltGoldSoft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3E2B5" />
          <stop offset=".55" stopColor="#D8B977" />
          <stop offset="1" stopColor="#B8914A" />
        </linearGradient>
        <linearGradient id="ltSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".25" stopColor="#FFFFFF" stopOpacity=".28" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".75" stopColor="#FFFFFF" stopOpacity=".22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ltLeaf" cx=".5" cy=".5" r=".6">
          <stop offset="0" stopColor="#EEE3C9" />
          <stop offset="1" stopColor="#D9C7A0" />
        </radialGradient>
        <radialGradient id="ltPh" cx=".5" cy=".38" r=".7">
          <stop offset="0" stopColor="#FCF1E6" />
          <stop offset=".6" stopColor="#F0DCC2" />
          <stop offset="1" stopColor="#E2C49A" />
        </radialGradient>
        <filter id="ltSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <pattern id="ltPat" width="36" height="36" patternUnits="userSpaceOnUse">
          <rect width="36" height="36" fill="#E2C98F" />
          <path
            d="M18 4 C22 12 22 14 18 18 C14 14 14 12 18 4Z M18 32 C22 24 22 22 18 18 C14 22 14 24 18 32Z M4 18 C12 14 14 14 18 18 C14 22 12 22 4 18Z M32 18 C24 14 22 14 18 18 C22 22 24 22 32 18Z"
            fill="#C29C55"
          />
          <circle cx="18" cy="18" r="2.4" fill="#F6E7C3" />
          {[0, 36].flatMap((x) => [0, 36].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill="#B8914A" />))}
        </pattern>
        <clipPath id="ltClip">
          <path d={FRAME_IN} />
        </clipPath>
        <symbol id="ltLotus" viewBox="0 0 120 100">
          <ellipse cx="60" cy="90" rx="40" ry="6" fill="url(#ltLeaf)" opacity=".55" filter="url(#ltSoft)" />
          <g filter="url(#ltSoft)" opacity=".85">
            <path d="M58 79 C34 81 14 70 6 50 C26 50 46 60 58 79Z" fill="url(#ltPetal)" />
            <path d="M62 79 C86 81 106 70 114 50 C94 50 74 60 62 79Z" fill="url(#ltPetal)" />
            <path d="M58 76 C38 70 26 50 28 24 C44 34 54 50 58 76Z" fill="url(#ltPetal2)" />
            <path d="M62 76 C82 70 94 50 92 24 C76 34 66 50 62 76Z" fill="url(#ltPetal2)" />
            <path d="M60 8 C74 28 74 54 60 76 C46 54 46 28 60 8Z" fill="url(#ltPetal)" />
          </g>
          <g fill="none" stroke="url(#ltGold)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M58 79 C34 81 14 70 6 50 C26 50 46 60 58 79Z" />
            <path d="M62 79 C86 81 106 70 114 50 C94 50 74 60 62 79Z" />
            <path d="M58 76 C38 70 26 50 28 24 C44 34 54 50 58 76Z" />
            <path d="M62 76 C82 70 94 50 92 24 C76 34 66 50 62 76Z" />
            <path d="M60 8 C74 28 74 54 60 76 C46 54 46 28 60 8Z" />
            <path d="M60 22 L60 64" opacity=".6" />
            <path d="M24 88 C44 82 76 82 96 88" />
            <path d="M38 95 C52 91 68 91 82 95" opacity=".6" />
          </g>
        </symbol>
        <symbol id="ltKbach" viewBox="0 0 240 24">
          <g fill="none" stroke="#C9A45C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12 H80" />
            <path d="M160 12 H236" />
            <path d="M80 12 C91 12 94 3 104 5 C99 8 99 10 104 12 C99 14 99 16 104 19 C94 21 91 12 80 12Z" />
            <path d="M160 12 C149 12 146 3 136 5 C141 8 141 10 136 12 C141 14 141 16 136 19 C146 21 149 12 160 12Z" />
            <path d="M120 1 C129 7 129 17 120 23 C111 17 111 7 120 1Z" fill="#FBF1E2" />
          </g>
          <path d="M120 7 C124 10 124 14 120 17 C116 14 116 10 120 7Z" fill="#C9A45C" />
          <circle cx="110" cy="12" r="1.7" fill="#C9A45C" />
          <circle cx="130" cy="12" r="1.7" fill="#C9A45C" />
          <circle cx="70" cy="12" r="1.2" fill="#C9A45C" />
          <circle cx="170" cy="12" r="1.2" fill="#C9A45C" />
        </symbol>
        <symbol id="ltJas" viewBox="0 0 20 20">
          <g fill="#FFFDF8" stroke="#D9C08A" strokeWidth=".6">
            <circle cx="10" cy="5.2" r="4" />
            <circle cx="14.6" cy="8.6" r="4" />
            <circle cx="12.8" cy="14" r="4" />
            <circle cx="7.2" cy="14" r="4" />
            <circle cx="5.4" cy="8.6" r="4" />
          </g>
          <circle cx="10" cy="10" r="2.3" fill="#E2C47E" />
        </symbol>
        <symbol id="ltBud" viewBox="0 0 14 26">
          <path d="M7 0 C11 6 12 14 7 26 C2 14 3 6 7 0Z" fill="url(#ltGold)" />
          <path d="M7 4 V20" stroke="#F6E7C3" strokeWidth=".7" />
        </symbol>
        <symbol id="ltCrown" viewBox="0 0 120 80">
          <g fill="url(#ltGoldSoft)" stroke="#9C7834" strokeWidth=".8" strokeLinejoin="round">
            <path d="M60 2 C71 16 73 32 60 47 C47 32 49 16 60 2Z" />
            <path d="M60 47 C46 47 35 39 29 27 C42 29 52 36 60 47Z" />
            <path d="M60 47 C74 47 85 39 91 27 C78 29 68 36 60 47Z" />
            <path d="M60 53 C40 57 21 51 9 37 C27 39 45 44 60 53Z" />
            <path d="M60 53 C80 57 99 51 111 37 C93 39 75 44 60 53Z" />
            <path d="M30 58 H90 L83 66 H37Z" />
            <path d="M44 66 H76 L70 74 H50Z" />
          </g>
          <g fill="none" stroke="#9C7834" strokeWidth="1" strokeLinecap="round">
            <path d="M29 27 C23 19 28 10 36 13" />
            <path d="M91 27 C97 19 92 10 84 13" />
            <path d="M9 37 C3 33 4 25 11 25" />
            <path d="M111 37 C117 33 116 25 109 25" />
            <path d="M60 10 V38" stroke="#F6E7C3" strokeWidth=".8" />
          </g>
          <circle cx="60" cy="78" r="2.4" fill="#B8914A" />
        </symbol>
        <symbol id="ltScroll" viewBox="0 0 120 30">
          <g fill="none" stroke="#B8914A" strokeWidth="1.3" strokeLinecap="round">
            <path d="M118 15 C98 15 86 7 72 8 C61 9 60 22 70 22 C78 22 79 14 72 14" />
            <path d="M72 8 C56 4 40 20 22 18 C12 17 8 12 2 15" />
            <path d="M30 17 C24 24 14 25 10 21" />
          </g>
          <path d="M42 15 C48 6 57 6 61 10 C55 13 48 15 42 15Z" fill="url(#ltGold)" />
          <path d="M90 13 C96 8 104 9 107 13 C101 15 95 15 90 13Z" fill="url(#ltGold)" />
          <circle cx="2" cy="15" r="2" fill="#C9A45C" />
        </symbol>
        <symbol id="ltDia" viewBox="0 0 30 30">
          <path d="M15 1 L29 15 L15 29 L1 15Z" fill="#FFFCF7" stroke="#B8914A" strokeWidth="1" />
          <path d="M15 6 L24 15 L15 24 L6 15Z" fill="none" stroke="#C9A45C" strokeWidth=".8" />
          <path d="M15 9 C18.5 12 18.5 17 15 21 C11.5 17 11.5 12 15 9Z" fill="url(#ltGold)" />
        </symbol>
        <symbol id="ltSprig" viewBox="0 0 120 160">
          <g fill="none" stroke="#B8914A" strokeWidth="1.6" strokeLinecap="round">
            <path d="M112 154 C82 130 58 100 48 64 C42 42 46 22 58 8" />
            <path d="M70 112 C56 112 44 104 38 92" />
            <path d="M52 78 C40 72 32 60 32 48" />
          </g>
          <g fill="url(#ltGold)" stroke="#9C7834" strokeWidth=".5">
            <path d="M92 138 C80 140 70 132 68 122 C80 120 90 128 92 138Z" />
            <path d="M76 120 C78 108 88 100 98 100 C98 112 88 120 76 120Z" />
            <path d="M58 96 C46 96 38 88 36 78 C48 76 56 84 58 96Z" />
            <path d="M52 70 C54 58 62 50 72 50 C72 62 64 70 52 70Z" />
            <path d="M46 44 C36 40 32 30 34 20 C44 24 48 34 46 44Z" />
            <path d="M58 8 C66 4 74 6 78 12 C70 16 62 14 58 8Z" />
          </g>
          <use href="#ltJas" x="28" y="82" width="18" height="18" />
          <use href="#ltJas" x="24" y="38" width="16" height="16" />
          <use href="#ltJas" x="96" y="140" width="16" height="16" />
        </symbol>
        <symbol id="ltTemple" viewBox="0 0 300 160">
          <g fill="#E8D5AE">
            <path d="M0 160 V146 H300 V160Z" />
            <path d="M30 146 V134 H270 V146Z" />
            <path d="M55 134 V124 H245 V134Z" />
            <path d="M134 124 C134 86 142 46 150 12 C158 46 166 86 166 124Z" />
            <path d="M88 124 C88 98 93 76 100 56 C107 76 112 98 112 124Z" />
            <path d="M188 124 C188 98 193 76 200 56 C207 76 212 98 212 124Z" />
            <path d="M48 134 C48 114 52 100 57 86 C62 100 66 114 66 134Z" />
            <path d="M234 134 C234 114 238 100 243 86 C248 100 252 114 252 134Z" />
            <path d="M112 124 V112 H134 V124Z M166 124 V112 H188 V124Z" />
          </g>
          <path d="M138 100 H162 M140 80 H160 M143 60 H157 M92 104 H108 M94 86 H106 M192 104 H208 M194 86 H206" fill="none" stroke="#F8EEDC" strokeWidth="1.2" />
        </symbol>
        <symbol id="ltPalm" viewBox="0 0 120 170">
          <g fill="none" stroke="#D6BE8E" strokeWidth="2.6" strokeLinecap="round">
            <path d="M60 170 C58 130 62 90 60 50" strokeWidth="3.6" />
            <path d="M60 50 C50 38 34 34 20 40" />
            <path d="M60 50 C48 30 40 22 30 16" />
            <path d="M60 50 C58 32 56 22 50 8" />
            <path d="M60 50 C64 32 70 22 78 12" />
            <path d="M60 50 C72 34 86 30 98 34" />
            <path d="M60 50 C74 44 88 46 100 56" />
            <path d="M60 50 C46 44 32 46 22 58" />
          </g>
        </symbol>
        <symbol id="ltCloud" viewBox="0 0 160 60">
          <path
            d="M10 52 C4 40 14 30 26 34 C26 20 44 14 54 24 C60 10 84 8 92 22 C102 14 120 18 120 32 C134 28 148 38 144 52 Z"
            fill="#F3E6CF"
            stroke="#E2CDA0"
            strokeWidth="1"
          />
        </symbol>
        <symbol id="ltFlames" viewBox="0 0 200 140">
          <path
            d="M0 140 C0 100 16 80 34 64 C26 86 30 104 48 112 C44 92 56 72 76 60 C66 84 72 108 96 118 C92 100 104 84 122 76 C112 96 118 116 140 126 C152 132 164 136 180 140 Z"
            fill="url(#ltGoldSoft)"
            stroke="#B8914A"
            strokeWidth=".8"
            strokeLinejoin="round"
            opacity=".9"
          />
          <path d="M0 140 C4 118 18 104 30 98 C26 112 30 124 44 130 L62 140Z" fill="#F6E7C3" stroke="#C9A45C" strokeWidth=".6" />
          <g fill="none" stroke="#9C7834" strokeWidth="1" strokeLinecap="round">
            <path d="M34 64 C42 56 52 58 50 66" />
            <path d="M76 60 C84 52 94 54 92 62" />
            <path d="M122 76 C130 70 138 72 136 80" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

const Use = ({ id, className, viewBox, style }: { id: string; className?: string; viewBox: string; style?: CSSProperties }) => (
  <svg className={className} viewBox={viewBox} style={style} aria-hidden>
    <use href={`#${id}`} />
  </svg>
);

/** Small line icons (calendar, pin, gallery, envelope…) */
function Icon({ name, className = s.ic }: { name: "calendar" | "pin" | "photo" | "mail" | "arrow" | "home" | "phone" | "check" | "x" | "prev" | "next" | "minus" | "plus"; className?: string }) {
  const paths: Record<typeof name, React.ReactNode> = {
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    photo: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="M20.5 16l-5-5-8 8" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="M3.5 6.5 12 13l8.5-6.5" />
      </>
    ),
    arrow: <path d="M9 6l6 6-6 6" />,
    home: <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />,
    phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
    check: <path d="M4 12.5l5 5L20 6.5" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    prev: <path d="M15 5l-7 7 7 7" />,
    next: <path d="M9 5l7 7-7 7" />,
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function Head({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className={`${s.head} ${s.reveal}`}>
      <span className={s.eyebrow}>— {eyebrow} —</span>
      <h2 className={s.stitle}>{title}</h2>
      <Use id="ltKbach" className={s.divider} viewBox="0 0 240 24" />
      {lede && <p className={s.lede}>{lede}</p>}
    </div>
  );
}

/** Opening envelope (public link only): the flap folds back, the seal pops, then the cover fades */
function Envelope({ data, t, monogram, guest }: { data: InvitationData; t: Dict; monogram: string; guest: string }) {
  const [opening, setOpening] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (gone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gone]);
  if (gone) return null;
  return (
    <div className={`${s.cover} ${opening ? s.coverOpening : ""}`} role="dialog" aria-modal aria-label={t.open}>
      <Use id="ltLotus" className={`${s.cvLotus} ${s.cvLotusL}`} viewBox="0 0 120 100" />
      <Use id="ltLotus" className={`${s.cvLotus} ${s.cvLotusR}`} viewBox="0 0 120 100" />
      <div className={s.env}>
        <div className={s.envFlap} aria-hidden>
          <svg viewBox="0 0 360 124" preserveAspectRatio="none">
            <path d="M0 24 Q0 0 24 0 H336 Q360 0 360 24 L180 124Z" fill="url(#ltPat)" stroke="#9C7834" strokeWidth="1.2" />
            <path d="M0 24 Q0 0 24 0 H336 Q360 0 360 24 L180 124Z" fill="url(#ltSheen)" />
            <path d="M14 22 L180 110 L346 22" fill="none" stroke="#F6E7C3" strokeWidth="1" />
          </svg>
        </div>
        <div className={s.envSeal} aria-hidden>
          {monogram}
        </div>
        <div className={s.envBody}>
          <Use id="ltCrown" className={s.envCrown} viewBox="0 0 120 80" />
          <p className={s.envTitle}>{T.km.defaultTitle}</p>
          <p className={s.envSub}>Wedding Invitation</p>
          <div className={s.envNames}>
            <span>{data.groomName}</span>
            <Use id="ltDia" viewBox="0 0 30 30" />
            <span>{data.brideName}</span>
          </div>
          <div className={s.envTo}>
            <p className={s.envToL}>{t.respect}</p>
            <p className={s.envGuest}>{guest}</p>
          </div>
          <p className={s.envDate} suppressHydrationWarning>
            {dotDate(data.startsAt)}
          </p>
          <button
            type="button"
            className={`${s.cta} ${s.envBtn}`}
            style={{ marginTop: 20 }}
            onClick={() => {
              if (opening) return;
              setOpening(true);
              setTimeout(() => setGone(true), 1650);
            }}
          >
            <Icon name="mail" />
            {t.open}
          </button>
          <p className={s.envHint}>{t.openHint}</p>
        </div>
      </div>
    </div>
  );
}

function Countdown({ iso, t, lang }: { iso: string; t: Dict; lang: InviteLang }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = now === null ? null : Math.max(0, new Date(iso).getTime() - now);
  const vals = left === null ? null : [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
  return (
    <div className={`${s.cd} ${s.reveal}`} role="timer" aria-live="off">
      {t.units.map((u, i) => (
        <div key={u} className={`${s.cdCard} ${i === 3 ? s.cdSec : ""}`}>
          <span className={s.cdDot} />
          <div className={s.cdNum} suppressHydrationWarning>
            {vals ? num(String(vals[i]).padStart(2, "0"), lang) : "--"}
          </div>
          <div className={s.cdUnit}>{u}</div>
        </div>
      ))}
    </div>
  );
}

function Rsvp({ data, t, lang }: { data: InvitationData; t: Dict; lang: InviteLang }) {
  const target = data.rsvp;
  const [state, action, pending] = useActionState<RsvpState, FormData>(
    target ? submitRsvp.bind(null, target.shareId, target.guestId) : async () => undefined,
    undefined,
  );
  const [count, setCount] = useState(1);
  const [answer, setAnswer] = useState<"YES" | "NO">("YES");
  // Inside the builder the preview sits in the builder's <form>: plain, unnamed, non-required fields
  const n = (name: string) => (target ? name : undefined);
  const err = state?.error === "name" ? t.errName : state?.error === "phone" ? t.errPhone : state?.error ? t.errClosed : null;

  if (state?.ok)
    return (
      <div className={s.success} role="status">
        <svg className={s.check} viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="#FBF3E7" />
          <circle className={s.c} cx="50" cy="50" r="40" fill="none" stroke="#C9A45C" strokeWidth="2.5" />
          <path className={s.k} d="M32 51l12 12 24-26" fill="none" stroke="#8C6A2F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className={s.thanks}>{t.thanks}</p>
        <p style={{ marginTop: 8 }}>{t.done}</p>
      </div>
    );

  const fields = (
    <>
      {target && <input className={s.hp} name="website" tabIndex={-1} autoComplete="off" aria-hidden />}
      <div className={s.field}>
        <label className={s.lbl} htmlFor={target ? "lt-name" : undefined}>
          {t.nameL}
        </label>
        <input id={target ? "lt-name" : undefined} className={s.inp} name={n("name")} required={!!target} defaultValue={data.guestName ?? ""} placeholder={t.nameP} autoComplete="name" />
      </div>
      <div className={s.field}>
        <label className={s.lbl} htmlFor={target ? "lt-phone" : undefined}>
          {t.phone}
        </label>
        <input id={target ? "lt-phone" : undefined} className={s.inp} name={n("phone")} type="tel" required={!!target} autoComplete="tel" />
      </div>
      <fieldset className={s.field}>
        <legend className={s.lbl} style={{ marginBottom: 8 }}>
          {t.attendL}
        </legend>
        <div className={s.seg}>
          {(["YES", "NO"] as const).map((a) => (
            <label key={a} className={s.segBtn}>
              <input type="radio" name={target ? "answer" : `lt-preview-${data.lang}`} value={a} checked={answer === a} onChange={() => setAnswer(a)} />
              <span className={s.segDot} />
              {a === "YES" ? t.yes : t.no}
            </label>
          ))}
        </div>
      </fieldset>
      {answer === "YES" && (
        <div className={s.field}>
          <span className={s.lbl}>{t.countL}</span>
          <div className={s.stepper}>
            <button type="button" className={s.stepBtn} onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="−">
              <Icon name="minus" />
            </button>
            <span className={s.stepVal} aria-live="polite">
              {num(count, lang)} {t.people}
            </span>
            <button type="button" className={s.stepBtn} onClick={() => setCount((c) => Math.min(20, c + 1))} disabled={count >= 20} aria-label="+">
              <Icon name="plus" />
            </button>
          </div>
          {target && <input type="hidden" name="count" value={count} />}
        </div>
      )}
      <div className={s.field}>
        <label className={s.lbl} htmlFor={target ? "lt-msg" : undefined}>
          {t.msgL}
        </label>
        <textarea id={target ? "lt-msg" : undefined} className={s.inp} name={n("message")} placeholder={t.msgP} />
      </div>
      <div className={s.submitRow}>
        {err && (
          <span className={s.err} role="alert">
            {err}
          </span>
        )}
        <button type={target ? "submit" : "button"} className={s.btnGold} disabled={pending}>
          <Icon name="check" />
          {t.submit}
        </button>
        {!target && <p className={s.note}>{t.preview}</p>}
      </div>
    </>
  );
  return target ? <form action={action}>{fields}</form> : <div>{fields}</div>;
}

export function LotusInvitation({
  data,
  autoPlayOnTap = false,
  idPrefix = "l-",
  gate = false,
  thumbnail = false,
}: {
  data: InvitationData;
  autoPlayOnTap?: boolean;
  idPrefix?: string;
  /** Show the opening envelope (public link only) */
  gate?: boolean;
  thumbnail?: boolean;
}) {
  const [lang, setLang] = useState<InviteLang>(data.lang);
  const [zoom, setZoom] = useState<number | null>(null);
  const t = T[lang];
  const id = (x: string) => `${idPrefix}${x}`;

  const photos = data.galleryUrls.length
    ? data.galleryUrls
    : [data.groomPhotoUrl, data.bridePhotoUrl, data.venuePhotoUrl].filter((u): u is string => !!u);
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") setZoom((z) => (z === null ? z : (z + 1) % photos.length));
      if (e.key === "ArrowLeft") setZoom((z) => (z === null ? z : (z - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, photos.length]);

  const [groom, bride] =
    lang === "en" ? [data.groomNameEn || data.groomName, data.brideNameEn || data.brideName] : [data.groomName, data.brideName];
  const initial = (x: string) => Array.from(x.trim())[0] ?? "";
  const monogram = `${initial(data.groomNameEn || data.groomName)}&${initial(data.brideNameEn || data.brideName)}`;
  const guest = data.guestName || t.dearGuest;
  const title = (lang === "en" ? data.titleEn : data.title) || t.defaultTitle;
  const heroPhoto = data.coverUrl ?? data.galleryUrls[0] ?? data.groomPhotoUrl ?? null;
  const when = formatInviteDate(data.startsAt, lang);
  const venueName = lang === "en" ? data.venueEn || data.venue : data.venue || data.venueEn;
  const mapQuery = [data.venueEn ?? data.venue, data.address].filter(Boolean).join(", ");
  const mapHref = data.mapUrl ?? (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null);
  const mapSrc = mapEmbedSrc(data);
  const days = parseAgenda(data.agenda).filter((d) => d.items.length);
  const groomParents = lang === "en" ? data.groomParentsEn || data.groomParents : data.groomParents || data.groomParentsEn;
  const brideParents = lang === "en" ? data.brideParentsEn || data.brideParents : data.brideParents || data.brideParentsEn;
  const phones = (data.contactPhones ?? "").split("\n").map((p) => p.trim()).filter(Boolean);

  const showVenue = data.showDetails && (!!venueName || !!data.address || !!mapHref);
  const showProgramme = data.showAgenda && days.length > 0;
  const quick = [
    showProgramme && (["programme", "calendar", t.quick.programme] as const),
    showVenue && (["venue", "pin", t.quick.venue] as const),
    photos.length > 0 && (["gallery", "photo", t.quick.gallery] as const),
    data.showRsvp && (["rsvp", "mail", t.quick.rsvp] as const),
  ].filter((q) => !!q);
  const nav = [
    ["invitation", t.nav.invitation, true],
    ["countdown", t.nav.countdown, data.showCountdown],
    ["programme", t.nav.programme, showProgramme],
    ["gallery", t.nav.gallery, photos.length > 0],
    ["venue", t.nav.venue, showVenue],
    ["rsvp", t.nav.rsvp, data.showRsvp],
  ] as const;

  return (
    <div
      className={`${s.root} ${lang === "en" ? s.en : s.km} ${lotusFontVars}`}
      style={{ "--t-top": data.titleTop, "--t-bottom": data.titleBottom, "--t-outline": data.titleOutline } as CSSProperties}
    >
      <Defs />
      {gate && <Envelope data={data} t={t} monogram={monogram} guest={guest} />}

      {/* photo viewer */}
      {zoom !== null && photos[zoom] && (
        <div className={s.lb} role="dialog" aria-modal aria-label={t.galTitle} onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
          <img src={photos[zoom]} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className={`${s.lbBtn} ${s.lbClose}`} aria-label="Close" onClick={() => setZoom(null)}>
            <Icon name="x" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className={`${s.lbBtn} ${s.lbPrev}`}
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((zoom - 1 + photos.length) % photos.length);
                }}
              >
                <Icon name="prev" />
              </button>
              <button
                type="button"
                className={`${s.lbBtn} ${s.lbNext}`}
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((zoom + 1) % photos.length);
                }}
              >
                <Icon name="next" />
              </button>
            </>
          )}
          <p className={s.lbCount}>
            {num(zoom + 1, lang)} / {num(photos.length, lang)}
          </p>
        </div>
      )}

      <div className={s.page}>
        {/* falling petals */}
        <div className={s.petals} aria-hidden hidden={thumbnail}>
          <div>
            {PETALS.map((p, i) => (
              <div
                key={i}
                className={`${s.petal} ${i % 2 ? s.pb : ""}`}
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: Math.round(p.size * 0.82),
                  animationDuration: `${p.dur}s`,
                  animationDelay: `${p.delay}s`,
                  opacity: p.opacity,
                }}
              >
                <i />
              </div>
            ))}
          </div>
        </div>

        {/* top bar: monogram, section links, language */}
        <header className={s.nav} hidden={thumbnail}>
          <a className={s.mono} href={`#${id("home")}`} aria-label={t.top}>
            {monogram}
          </a>
          <nav className={s.links} aria-label="sections">
            {nav
              .filter(([, , on]) => on)
              .map(([target, label]) => (
                <a key={target} className={s.navlink} href={`#${id(target)}`}>
                  {label}
                </a>
              ))}
          </nav>
          <div className={s.langs} role="group" aria-label="Language">
            {(["km", "en"] as const).map((l) => (
              <button key={l} type="button" className={`${s.langBtn} ${lang === l ? s.on : ""}`} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l === "km" ? "ខ្មែរ" : "EN"}
              </button>
            ))}
          </div>
        </header>

        {/* A. hero: the royal arch */}
        <section id={id("home")} className={s.frame} aria-label={title}>
          <svg className={s.framePat} aria-hidden preserveAspectRatio="none">
            <rect width="100%" height="100%" fill="url(#ltPat)" />
            <rect width="100%" height="100%" fill="url(#ltSheen)" />
          </svg>
          <span className={`${s.cap} ${s.capL}`} aria-hidden />
          <span className={`${s.cap} ${s.capR}`} aria-hidden />
          <div className={s.arch}>
            <Use id="ltCloud" className={`${s.scene} ${s.cloud} ${s.c1}`} viewBox="0 0 160 60" />
            <Use id="ltCloud" className={`${s.scene} ${s.cloud} ${s.c2}`} viewBox="0 0 160 60" />
            <svg className={`${s.scene} ${s.palms}`} viewBox="0 0 200 170" aria-hidden>
              <use href="#ltPalm" x="0" y="10" width="110" height="160" />
              <use href="#ltPalm" x="70" y="-6" width="120" height="176" />
            </svg>
            <Use id="ltTemple" className={`${s.scene} ${s.temple}`} viewBox="0 0 300 160" />
            {GARLANDS.map((g, i) => (
              <div key={i} className={`${s.gar} ${g.cls}`} aria-hidden>
                {Array.from({ length: g.beads }, (_, j) => (
                  <Use key={j} id="ltJas" className={s.b} viewBox="0 0 20 20" />
                ))}
                <Use id="ltBud" className={s.tip} viewBox="0 0 14 26" />
              </div>
            ))}

            <div className={s.archContent}>
              <Use id="ltCrown" className={`${s.finial} ${s.rise}`} viewBox="0 0 120 80" />
              {data.titleEnabled && <h1 className={`${s.title} ${s.rise} ${s.d1}`}>{title}</h1>}
              {lang === "km" && (
                <div className={`${s.subRow} ${s.rise} ${s.d2}`}>
                  <Use id="ltScroll" className={s.scroll} viewBox="0 0 120 30" style={{ transform: "scaleX(-1)" }} />
                  <span className={s.sub}>Wedding Invitation</span>
                  <Use id="ltScroll" className={s.scroll} viewBox="0 0 120 30" />
                </div>
              )}

              <div className={`${s.photo} ${s.rise} ${s.d3}`}>
                <Use id="ltSprig" className={`${s.sprig} ${s.sprigL}`} viewBox="0 0 120 160" />
                <Use id="ltSprig" className={`${s.sprig} ${s.sprigR}`} viewBox="0 0 120 160" />
                <Use id="ltCrown" className={s.pTop} viewBox="0 0 120 80" />
                <svg className={s.f} viewBox="0 0 400 400" role="img" aria-label={`${groom} & ${bride}`}>
                  <path d={FRAME_OUT} fill="url(#ltGold)" stroke="#9C7834" strokeWidth="1.2" />
                  <g clipPath="url(#ltClip)">
                    <rect width="400" height="400" fill="url(#ltPh)" />
                    {heroPhoto ? (
                      // anchor the crop to the top: portrait couple photos keep their faces in the round frame
                      <image href={heroPhoto} x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMin slice" />
                    ) : (
                      <>
                        <use href="#ltTemple" x="70" y="190" width="260" height="140" opacity=".55" />
                        <text x="200" y="200" textAnchor="middle" fontFamily="var(--font-playfair), serif" fontStyle="italic" fontSize="44" fill="#7A5A26">
                          {monogram.replace("&", " & ")}
                        </text>
                      </>
                    )}
                  </g>
                  <path d={FRAME_IN} fill="none" stroke="#FFF6E0" strokeWidth="3" />
                </svg>
                <Use id="ltLotus" className={s.pBot} viewBox="0 0 120 100" />
              </div>

              <div className={`${s.names} ${s.rise} ${s.d4}`}>
                <span className={s.nameKm}>{groom}</span>
                <Use id="ltDia" className={s.dia} viewBox="0 0 30 30" />
                <span className={s.nameKm}>{bride}</span>
              </div>
              {lang === "km" && (data.groomNameEn || data.brideNameEn) && (
                <p className={`${s.nameEn} ${s.rise} ${s.d4}`}>
                  {data.groomNameEn}
                  <span>&amp;</span>
                  {data.brideNameEn}
                </p>
              )}
              <svg className={`${s.kbach} ${s.rise} ${s.d4}`} viewBox="0 0 240 24" preserveAspectRatio="none" aria-hidden>
                <use href="#ltKbach" />
              </svg>
              <p className={`${s.inviteText} ${s.rise} ${s.d5}`}>{data.message || INVITE_TEXT[lang].message}</p>

              {quick.length > 0 && (
                <nav className={`${s.quick} ${s.rise} ${s.d5}`} aria-label="Quick links">
                  {quick.map(([target, icon, label]) => (
                    <a key={target} className={s.q} href={`#${id(target)}`}>
                      <Icon name={icon} />
                      {label}
                    </a>
                  ))}
                </nav>
              )}

              <div className={`${s.plaque} ${s.rise} ${s.d6}`}>
                <svg className={`${s.orn} ${s.ornT}`} viewBox="0 0 34 14" aria-hidden>
                  <path d="M17 1 L24 7 L17 13 L10 7Z" fill="#FFF9F0" stroke="#C9A45C" />
                  <path d="M1 7 H9 M25 7 H33" stroke="#C9A45C" />
                </svg>
                <div className={s.pRow}>
                  <Icon name="calendar" />
                  <span suppressHydrationWarning>{when}</span>
                </div>
                {venueName && (
                  <div className={s.pRow}>
                    <Icon name="pin" />
                    <span>{venueName}</span>
                  </div>
                )}
                <svg className={`${s.orn} ${s.ornB}`} viewBox="0 0 34 14" aria-hidden>
                  <path d="M17 1 L24 7 L17 13 L10 7Z" fill="#FFF9F0" stroke="#C9A45C" />
                  <path d="M1 7 H9 M25 7 H33" stroke="#C9A45C" />
                </svg>
              </div>

              {data.showRsvp && (
                <a className={`${s.cta} ${s.rise} ${s.d6}`} href={`#${id("rsvp")}`}>
                  {t.rsvpCta}
                  <Icon name="arrow" />
                </a>
              )}
            </div>

            <div className={s.waves} aria-hidden />
            <Use id="ltFlames" className={`${s.flame} ${s.flameL}`} viewBox="0 0 200 140" />
            <Use id="ltFlames" className={`${s.flame} ${s.flameR}`} viewBox="0 0 200 140" />
            <Use id="ltLotus" className={s.bLotus} viewBox="0 0 120 100" />
          </div>
        </section>

        {/* B. personal invitation */}
        <section id={id("invitation")} className={`${s.sec} ${s.ivory}`} style={{ paddingTop: 56 }}>
          <div className={s.wrap}>
            <Head eyebrow="A Personal Invitation" title={t.inviteTitle} />
            <div className={`${s.card} ${s.inviteCard} ${s.reveal}`}>
              <div className={s.seal} aria-hidden>
                {monogram}
              </div>
              <p className={s.respect}>{t.respect}</p>
              <p className={s.honor}>{t.honor}</p>
              <p className={s.guest}>{guest}</p>
              <div className={s.underline} />
              <p className={s.inviteMsg}>{data.message || INVITE_TEXT[lang].message}</p>
              {data.showParents && (groomParents || brideParents) && (
                <div className={s.parents}>
                  {groomParents && (
                    <div className={s.parent}>
                      <p className={s.parentL}>{t.groomParents}</p>
                      <p className={s.parentN}>{groomParents}</p>
                    </div>
                  )}
                  {brideParents && (
                    <div className={s.parent}>
                      <p className={s.parentL}>{t.brideParents}</p>
                      <p className={s.parentN}>{brideParents}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* C. countdown */}
        {data.showCountdown && (
          <section id={id("countdown")} className={s.sec}>
            <div className={s.wrap}>
              <Head eyebrow="Save the Date" title={t.cdTitle} />
              <Countdown iso={data.startsAt} t={t} lang={lang} />
              <p className={`${s.cdDate} ${s.reveal}`} suppressHydrationWarning>
                {dotDate(data.startsAt)}
              </p>
            </div>
          </section>
        )}

        {/* D. programme */}
        {showProgramme && (
          <section id={id("programme")} className={`${s.sec} ${s.dots}`}>
            <div className={s.wrap}>
              <Head eyebrow="Order of Ceremonies" title={t.schTitle} />
              <div className={s.tlWrap}>
                {days.map((day, i) => (
                  <div key={i} className={s.day}>
                    {(day.title || day.date) && (
                      <div className={`${s.dayLabel} ${s.reveal}`}>
                        <span className={s.dayChip}>{[day.title, day.date].filter(Boolean).join(" · ")}</span>
                      </div>
                    )}
                    <ol className={s.tl}>
                      {day.items.map((it, j) => (
                        <li key={j} className={`${s.ev} ${s.reveal}`}>
                          <div className={s.evIc} aria-hidden>
                            <Use id="ltLotus" viewBox="0 0 120 100" style={{ width: 26, height: 22 }} />
                          </div>
                          <div className={s.evBody}>
                            {it.time && <p className={s.evTime}>{it.time}</p>}
                            <h3 className={s.evTitle}>{it.text}</h3>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* E. gallery */}
        {photos.length > 0 && (
          <section id={id("gallery")} className={s.sec}>
            <div className={s.wrap}>
              <Head eyebrow="Our Moments" title={t.galTitle} />
              <div className={s.masonry}>
                {photos.map((src, i) => (
                  <button key={src} type="button" className={`${s.tile} ${TILE_SHAPES[i % TILE_SHAPES.length]} ${s.reveal}`} onClick={() => setZoom(i)} aria-label={`${t.galTitle} ${i + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
              <p className={s.galHint}>{t.galHint}</p>
            </div>
          </section>
        )}

        {/* F. location */}
        {showVenue && (
          <section id={id("venue")} className={`${s.sec} ${s.ivory}`}>
            <div className={s.wrap}>
              <Head eyebrow="Where We Celebrate" title={t.locTitle} />
              <div className={s.loc}>
                <div className={`${s.card} ${s.locCard} ${s.reveal}`}>
                  {venueName && <p className={s.venue}>{venueName}</p>}
                  <div style={{ height: 8 }} />
                  {data.address && (
                    <div className={s.info}>
                      <span className={s.icCircle}>
                        <Icon name="pin" />
                      </span>
                      <div>
                        <p className={s.infoL}>{t.addrL}</p>
                        <p className={s.infoV}>{data.address}</p>
                      </div>
                    </div>
                  )}
                  <div className={s.info}>
                    <span className={s.icCircle}>
                      <Icon name="calendar" />
                    </span>
                    <div>
                      <p className={s.infoL}>{t.dateL}</p>
                      <p className={s.infoV} suppressHydrationWarning>
                        {when}
                      </p>
                    </div>
                  </div>
                  {phones.length > 0 && (
                    <div className={s.info}>
                      <span className={s.icCircle}>
                        <Icon name="phone" />
                      </span>
                      <div>
                        <p className={s.infoL}>{t.phoneL}</p>
                        <p className={s.infoV}>
                          {phones.map((p) => (
                            <a key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} style={{ display: "block" }}>
                              {p}
                            </a>
                          ))}
                        </p>
                      </div>
                    </div>
                  )}
                  {mapHref && (
                    <a className={s.btnGold} style={{ marginTop: 18 }} href={mapHref} target="_blank" rel="noopener noreferrer">
                      <Icon name="pin" />
                      {t.directions}
                    </a>
                  )}
                </div>
                {data.showMap && mapSrc ? (
                  <div className={`${s.map} ${s.reveal}`}>
                    <iframe title={t.locTitle} loading="lazy" src={mapSrc ?? undefined} />
                  </div>
                ) : (
                  data.venuePhotoUrl && (
                    <div className={`${s.map} ${s.reveal}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                      <img src={data.venuePhotoUrl} alt="" loading="lazy" />
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {/* ចំណងដៃ: bank KHQR */}
        {hasGiftQr(data) && (
          <section id={id("gift")} className={s.sec}>
            <div className={s.wrap}>
              <Head eyebrow="Wedding Gift" title={giftQrTitle(lang)} />
              <div className={s.reveal}>
                <GiftQr data={data} lang={lang} accent="#a8823c" />
              </div>
            </div>
          </section>
        )}

        {/* G. RSVP */}
        {data.showRsvp && (
          <section id={id("rsvp")} className={`${s.sec} ${s.dots}`}>
            <div className={s.wrap}>
              <Head eyebrow="Kindly Reply" title={t.rsvpTitle} lede={t.rsvpIntro} />
              <div className={`${s.card} ${s.rsvpCard} ${s.reveal}`}>
                <Rsvp data={data} t={t} lang={lang} />
              </div>
            </div>
          </section>
        )}

        {/* H. footer */}
        <footer id={id("footer")} className={s.foot}>
          <Use id="ltLotus" className={`${s.footLotus} ${s.reveal}`} viewBox="0 0 120 100" />
          <p className={s.footKm}>
            {data.groomName} &amp; {data.brideName}
          </p>
          {(data.groomNameEn || data.brideNameEn) && (
            <p className={s.footNames}>
              {data.groomNameEn || data.groomName} &amp; {data.brideNameEn || data.brideName}
            </p>
          )}
          <p className={s.footDate} suppressHydrationWarning>
            {dotDate(data.startsAt)}
          </p>
          <Use id="ltKbach" className={s.divider} viewBox="0 0 240 24" style={{ margin: "18px auto 0" }} />
          <p className={s.footClose}>{t.footClose}</p>
          <div className={s.footSmall}>
            <span>
              {groom} &amp; {bride}
            </span>
            <a href={`#${id("home")}`}>{t.top} ↑</a>
          </div>
        </footer>

        {data.musicUrl && !thumbnail && (
          <MusicButton src={data.musicUrl} labels={[INVITE_TEXT[lang].playMusic, INVITE_TEXT[lang].pauseMusic]} autoPlayOnTap={autoPlayOnTap} />
        )}
      </div>
    </div>
  );
}
