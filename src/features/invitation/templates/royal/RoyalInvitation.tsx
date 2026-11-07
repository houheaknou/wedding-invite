"use client";

import { useActionState, useState, type CSSProperties } from "react";
import { GiftQr, giftQrTitle, hasGiftQr } from "@/features/invitation/templates/GiftQr";
import { submitRsvp, type RsvpState } from "@/features/invitation/rsvp-actions";
import { MusicButton } from "@/features/invitation/templates/MusicButton";
import { parseAgenda } from "@/features/invitation/agenda";
import { royalFontVars } from "@/features/invitation/fonts";
import {
  INVITE_TEXT,
  type InvitationData,
  type InviteLang,
  mapEmbedSrc,
} from "@/features/invitation/shared";
import s from "./royal.module.css";

const ART = "/templates/royal";

/** Labels printed on the Royal gold invitation; the ខ្មែរ | EN switch flips between them. */
const T = {
  km: {
    title: "សេចក្តីអញ្ជើញមង្គលការ",
    open: "បើកសំបុត្រ",
    at: "វេលាម៉ោង",
    invited: "សូមគោរពអញ្ជើញ",
    groomParents: "ឪពុកម្តាយកូនកំលោះ",
    brideParents: "ឪពុកម្តាយកូនក្រមុំ",
    mapBtn: "មើលលើ Google Maps",
    name: "ឈ្មោះពេញ *",
    phone: "លេខទូរស័ព្ទ *",
    count: "ចំនួនភ្ញៀវ",
    person: "នាក់",
    attend: "តើលោកអ្នកនឹងចូលរួមដែរឬទេ? *",
    yes: "ចូលរួម",
    no: "មិនបាន",
    maybe: "មិនទាន់ប្រាកដ",
    message: "សារជូនពរ (ស្រេចចិត្ត)",
    messagePh: "សូមសរសេរសារជូនពរ…",
    submit: "ផ្ញើការឆ្លើយតប",
    sent: "សូមអរគុណ! យើងបានទទួលការឆ្លើយតបរបស់អ្នកហើយ។",
    errName: "សូមបញ្ចូលឈ្មោះ",
    errPhone: "សូមបញ្ចូលលេខទូរស័ព្ទ",
    errClosed: "ការឆ្លើយតបត្រូវបានបិទ",
    errLimit: "ផ្ញើច្រើនដងពេក សូមព្យាយាមម្តងទៀតពេលក្រោយ",
    preview: "នេះជាការមើលជាមុន — ទម្រង់នេះដំណើរការនៅលើតំណដែលបានចែករំលែក។",
    copied: "បានចម្លងតំណ",
  },
  en: {
    title: "Wedding Invitation",
    open: "Open Invitation",
    at: "AT",
    invited: "Kindly invited",
    groomParents: "Groom's Parents",
    brideParents: "Bride's Parents",
    mapBtn: "View on Google Maps",
    name: "Full Name *",
    phone: "Phone Number *",
    count: "Number of Guests",
    person: "",
    attend: "Will you attend? *",
    yes: "Yes",
    no: "No",
    maybe: "Maybe",
    message: "Message (Optional)",
    messagePh: "Leave a message...",
    submit: "Submit RSVP",
    sent: "Thank you! We've received your reply.",
    errName: "Please enter your name",
    errPhone: "Please enter your phone number",
    errClosed: "RSVP is closed",
    errLimit: "Too many replies — please try again later",
    preview: "This is a preview — the form works on the shared link.",
    copied: "Link copied",
  },
} satisfies Record<InviteLang, Record<string, string | string[]>>;

const KM_DIGITS = "០១២៣៤៥៦៧៨៩";
const km = (v: string | number) =>
  String(v).replace(/\d/g, (d) => KM_DIGITS[Number(d)]);
const KM_DAYS = [
  "អាទិត្យ",
  "ច័ន្ទ",
  "អង្គារ",
  "ពុធ",
  "ព្រហស្បតិ៍",
  "សុក្រ",
  "សៅរ៍",
];
const KM_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];
const EN_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const EN_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** Date row pieces in Cambodia time: weekday | day | month year, and the time line. */
function dateParts(iso: string, lang: InviteLang) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const h = d.getUTCHours();
  const hm = `${String(h % 12 || 12).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  if (lang === "km") {
    const period =
      h < 12
        ? "ព្រឹក"
        : h < 13
          ? "ថ្ងៃត្រង់"
          : h < 17
            ? "រសៀល"
            : h < 19
              ? "ល្ងាច"
              : "យប់";
    return {
      weekday: KM_DAYS[d.getUTCDay()],
      day: km(d.getUTCDate()),
      monthYear: `${KM_MONTHS[d.getUTCMonth()]} ${km(d.getUTCFullYear())}`,
      time: `${km(hm)} ${period}`,
    };
  }
  return {
    weekday: EN_DAYS[d.getUTCDay()],
    day: String(d.getUTCDate()),
    monthYear: `${EN_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    time: `${hm} ${h < 12 ? "AM" : "PM"}`,
  };
}

function Corners() {
  return (
    <>
      {[s.tl, s.tr, s.bl, s.br].map((pos) => (
        <svg
          key={pos}
          className={`${s.corner} ${pos}`}
          viewBox="0 0 34 34"
          aria-hidden
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          >
            <path d="M6 30V12c0-4 2-6 6-6h18" />
            <path d="M6 16c5 0 8-3 8-8M11 11c3 0 5 2 5 5" />
            <path d="M20 6c2-3 5-3 6-1M6 20c-3 2-3 5-1 6" />
          </g>
          <path d="M5 5l3 3-3 3-3-3z" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

function Flourish({ width = 120 }: { width?: number }) {
  return (
    <svg
      width={width}
      height={(width * 26) / 140}
      viewBox="0 0 140 26"
      aria-hidden
      style={{ display: "block", margin: "0 auto" }}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      >
        <path d="M4 13h36M100 13h36" />
        <path d="M40 13c6 0 9-7 16-7 4 0 6 3 4 5-2 2-5 0-3-2" />
        <path d="M100 13c-6 0-9-7-16-7-4 0-6 3-4 5 2 2 5 0 3-2" />
        <path d="M44 13c5 0 8 6 14 6 3 0 4-2 3-3M96 13c-5 0-8 6-14 6-3 0-4-2-3-3" />
      </g>
      <path d="M70 2l8 11-8 11-8-11z" fill="currentColor" />
      <path d="M70 7l4 6-4 6-4-6z" fill="#fff8e8" />
      <circle cx="70" cy="13" r="1.6" fill="currentColor" />
    </svg>
  );
}

function Lozenge({ w = 30 }: { w?: number }) {
  return (
    <svg
      width={w}
      height={(w * 46) / 30}
      viewBox="0 0 30 46"
      aria-hidden
      className={s.gold}
    >
      <path
        d="M15 2 28 23 15 44 2 23z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M15 11 22 23 15 35 8 23z" fill="currentColor" opacity=".85" />
      <circle cx="15" cy="23" r="2" fill="#fff8e8" />
    </svg>
  );
}

function Silhouette() {
  return (
    <svg width="80" height="92" viewBox="0 0 84 96" aria-hidden>
      <circle cx="42" cy="34" r="17" fill="currentColor" />
      <path d="M8 96c2-23 17-35 34-35s32 12 34 35z" fill="currentColor" />
    </svg>
  );
}

function Join() {
  return (
    <div className={s.join}>
      <Flourish />
    </div>
  );
}

function RsvpForm({ data, t }: { data: InvitationData; t: (typeof T)["km"] }) {
  const target = data.rsvp;
  const [state, action, pending] = useActionState<RsvpState, FormData>(
    target
      ? submitRsvp.bind(null, target.shareId, target.guestId)
      : async () => undefined,
    undefined,
  );
  const err =
    state?.error === "name"
      ? t.errName
      : state?.error === "phone"
        ? t.errPhone
        : state?.error === "limit"
          ? t.errLimit
          : state?.error
            ? t.errClosed
          : null;
  const icon = (d: string) => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
  // In builder previews the form sits inside the builder's <form>: render plain, unnamed fields
  // so nothing nests or leaks into the builder's submission.
  const n = (name: string) => (target ? name : undefined);
  const fields = (
    <>
      {target && (
        <input
          className={s.hp}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />
      )}
      <div className={s.col}>
        <label>
          <span className={s.l}>
            {icon(
              "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21c0-4 4-7 8-7s8 3 8 7z",
            )}
            {t.name}
          </span>
          <input
            name={n("name")}
            required={!!target}
            defaultValue={data.guestName ?? ""}
            placeholder={data.lang === "km" ? "ឈ្មោះរបស់អ្នក" : "Your name"}
          />
        </label>
        <label>
          <span className={s.l}>
            {icon(
              "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z",
            )}
            {t.phone}
          </span>
          <input
            name={n("phone")}
            type="tel"
            required={!!target}
            placeholder="012 345 678"
          />
        </label>
        <label>
          <span className={s.l}>
            {icon(
              "M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6zM17 6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM15 14.5c3 0 7 1.5 7 5.5h-5",
            )}
            {t.count}
          </span>
          <select name={n("count")} defaultValue="1">
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {data.lang === "km"
                  ? `${km(n)} ${t.person}`
                  : `${n} ${n === 1 ? "person" : "people"}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={s.col}>
        <p className={s.attendLabel}>{t.attend}</p>
        <div className={s.radios}>
          {(["YES", "NO", "MAYBE"] as const).map((a) => (
            <label key={a}>
              <input
                type="radio"
                name={target ? "answer" : `preview-answer-${data.lang}`}
                value={a}
                defaultChecked={a === "YES"}
              />
              {a === "YES" ? t.yes : a === "NO" ? t.no : t.maybe}
            </label>
          ))}
        </div>
        <label>
          {t.message}
          <textarea name={n("message")} rows={3} placeholder={t.messagePh} />
        </label>
        <button
          className={s.btn}
          type={target ? "submit" : "button"}
          disabled={pending || state?.ok}
        >
          {state?.ok ? "✓" : t.submit}
        </button>
      </div>
      {state?.ok && <p className={`${s.formMsg} ${s.ok}`}>{t.sent}</p>}
      {err && <p className={`${s.formMsg} ${s.err}`}>{err}</p>}
      {!target && <p className={`${s.formMsg} ${s.ok}`}>{t.preview}</p>}
    </>
  );
  return target ? (
    <form action={action} className={s.rsvp}>
      {fields}
    </form>
  ) : (
    <div className={s.rsvp}>{fields}</div>
  );
}

export function RoyalInvitation({
  data,
  autoPlayOnTap = false,
  idPrefix = "r-",
  gate = false,
  thumbnail = false,
}: {
  data: InvitationData;
  autoPlayOnTap?: boolean;
  /** Section ids are `${idPrefix}home` etc., so two previews on one page don't clash */
  idPrefix?: string;
  /** Public page: show only the cover until "Open invitation" is pressed */
  gate?: boolean;
  /** Gallery thumbnail: no language switch */
  thumbnail?: boolean;
}) {
  const [lang, setLang] = useState<InviteLang>(data.lang);
  const [opened, setOpened] = useState(!gate);
  const t = T[lang];
  const tx = INVITE_TEXT[data.lang];
  const date = dateParts(data.startsAt, lang);
  const days = parseAgenda(data.agenda).filter(
    (d) => d.items.length || d.title,
  );
  const subtitle =
    data.titleEn ??
    "Together with their families\nyou are warmly invited to the wedding of";
  const mapQuery = [data.venueEn ?? data.venue, data.address]
    .filter(Boolean)
    .join(", ");
  const mapHref =
    data.mapUrl ??
    (mapQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      : null);
  const mapSrc = mapEmbedSrc(data);
  // Share targets are built on click so server and client render the same markup
  const share = (base: string) => () =>
    window.open(
      base + encodeURIComponent(window.location.href),
      "_blank",
      "noopener",
    );
  const bg =
    {
      damask: s.damask,
      peach: s.peach,
      floral: s.floral,
      custom: data.backgroundUrl ? s.custom : "",
    }[data.background] ?? "";
  const rootStyle = {
    "--gold": data.themeColor,
    ...(bg === s.custom && { "--custom-bg": `url("${data.backgroundUrl}")` }),
  } as CSSProperties;
  return (
    <div
      className={`${s.root} ${bg} ${data.fontStyle === "sans" ? s.sans : ""} ${opened ? "" : s.closed} ${royalFontVars}`}
      style={rootStyle}
    >
      {/* language switch only (no section links) */}
      <nav className={s.nav} hidden={thumbnail}>
        <span className={s.lang}>
          <button
            type="button"
            className={lang === "km" ? s.on : ""}
            onClick={() => setLang("km")}
          >
            ខ្មែរ
          </button>
          |
          <button
            type="button"
            className={lang === "en" ? s.on : ""}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </span>
      </nav>

      {/* 1. Cover */}
      <section id={`${idPrefix}home`} className={s.cover}>
        <div className={s.coverBody}>
          <Flourish width={110} />
          {data.titleEnabled && (
            <h1 className={s.kmTitle}>{data.title || T.km.title}</h1>
          )}
          <p className={s.caps}>{subtitle}</p>
          <div className={s.names}>
            <div>
              <p className={s.km}>{data.groomName}</p>
              {data.groomNameEn && (
                <p className={s.script}>{data.groomNameEn}</p>
              )}
            </div>
            <Lozenge />
            <div>
              <p className={s.km}>{data.brideName}</p>
              {data.brideNameEn && (
                <p className={s.script}>{data.brideNameEn}</p>
              )}
            </div>
          </div>
          <div className={s.date} suppressHydrationWarning>
            <span>{date.weekday}</span>
            <span className={s.day}>{date.day}</span>
            <span>{date.monthYear}</span>
          </div>
          <p className={`${s.caps} ${s.time}`}>
            {t.at} {date.time}
          </p>
          <a
            className={s.btn}
            href={`#${idPrefix}invitation`}
            onClick={(e) => {
              if (opened) return;
              // First open: reveal the rest of the invitation, then scroll to it
              e.preventDefault();
              setOpened(true);
              requestAnimationFrame(() =>
                document
                  .getElementById(`${idPrefix}invitation`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              );
            }}
          >
            {t.open} ›
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static template art */}
        <img className={s.scene} src={`${ART}/cover-light.jpg?v=3`} alt="" />
      </section>

      {opened && (
        <>
          {/* 2. Invitation */}
          <Join />
          <section id={`${idPrefix}invitation`} className={s.panel}>
            <Corners />
            <h2 className={s.secTitle}>ពិធីមង្គលការ</h2>
            <p className={s.caps} style={{ marginBottom: 16 }}>
              Wedding invitation
            </p>
            {data.guestName && (
              <p className={s.guestLine}>
                {t.invited} <b>{data.guestName}</b>
              </p>
            )}
            <div className={s.portraits}>
              {[data.groomPhotoUrl, data.bridePhotoUrl].map((url, i) => (
                <div key={i} className={s.ring}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                  <div>{url ? <img src={url} alt="" /> : <Silhouette />}</div>
                </div>
              ))}
            </div>
            <div className={s.coupleNames}>
              <div>
                <p className={s.km}>{data.groomName}</p>
                {data.groomNameEn && (
                  <p className={s.script}>{data.groomNameEn}</p>
                )}
              </div>
              <Lozenge w={22} />
              <div>
                <p className={s.km}>{data.brideName}</p>
                {data.brideNameEn && (
                  <p className={s.script}>{data.brideNameEn}</p>
                )}
              </div>
            </div>
            {data.showParents &&
              (data.groomParents ||
                data.brideParents ||
                data.groomParentsEn ||
                data.brideParentsEn) && (
                <div className={s.parents}>
                  {(
                    [
                      [
                        T.km.groomParents,
                        T.en.groomParents,
                        data.groomParents,
                        data.groomParentsEn,
                      ],
                      [
                        T.km.brideParents,
                        T.en.brideParents,
                        data.brideParents,
                        data.brideParentsEn,
                      ],
                    ] as const
                  ).map(([role, roleEn, kmNames, enNames]) => (
                    <div key={roleEn}>
                      <p className={s.role}>{role}</p>
                      <p className={s.roleEn}>{roleEn}</p>
                      {kmNames && <p className={s.kmNames}>{kmNames}</p>}
                      {enNames && <p className={s.enNames}>{enNames}</p>}
                    </div>
                  ))}
                </div>
              )}
            <p className={s.wording}>
              {data.message || INVITE_TEXT.km.message}
            </p>
            <p className={s.wordingEn}>
              {"Request the honour of your presence\nat our wedding ceremony"}
            </p>
          </section>

          {/* 3. Programme */}
          {data.showAgenda && days.length > 0 && (
            <>
              <Join />
              <section id={`${idPrefix}programme`} className={s.panel}>
                <Corners />
                <h2 className={s.secTitle}>កម្មវិធីពិធី</h2>
                <p className={s.secEn}>Wedding Programme</p>
                <div className={`${s.days} ${days.length === 2 ? s.two : ""}`}>
                  {days.map((day, i) => (
                    <div key={i}>
                      {day.title && (
                        <span className={s.ribbon}>
                          <svg
                            viewBox="0 0 200 34"
                            preserveAspectRatio="none"
                            aria-hidden
                          >
                            <path
                              d="M10 3h180l-9 14 9 14H10l9-14z"
                              fill="#fffaf0"
                              stroke="currentColor"
                              strokeWidth="1.1"
                            />
                          </svg>
                          {day.title}
                        </span>
                      )}
                      {day.date && <p className={s.dayDate}>{day.date}</p>}
                      <table className={s.items}>
                        <tbody>
                          {day.items.map((item, j) => (
                            <tr key={j}>
                              <td>{item.time}</td>
                              <td>{item.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* 4. Venue */}
          {data.showDetails && (data.venue || data.venueEn || data.address) && (
            <>
              <Join />
              <section id={`${idPrefix}venue`} className={s.panel}>
                <Corners />
                <div className={s.secInline}>
                  <h2 className={s.secTitle}>ទីតាំង</h2>
                  <span />
                  <p>Venue</p>
                </div>
                <div className={s.venue}>
                  <div className={s.venuePhoto}>
                    {data.venuePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user upload
                      <img src={data.venuePhotoUrl} alt="" />
                    ) : (
                      <svg
                        width="200"
                        height="88"
                        viewBox="0 0 220 96"
                        aria-hidden
                      >
                        <g fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M40 52 110 18l70 34M30 52h160M50 52v40M80 52v40M140 52v40M170 52v40M96 92V66h28v26M20 92h180M110 6v12" />
                        </g>
                      </svg>
                    )}
                  </div>
                  <div className={s.info}>
                    <svg
                      className={s.gold}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4" />
                    </svg>
                    {(data.venueEn || data.venue) && (
                      <b>{data.venueEn || data.venue}</b>
                    )}
                    <small>
                      {[data.venueEn ? data.venue : null, data.address]
                        .filter(Boolean)
                        .join("\n")}
                    </small>
                  </div>
                  {data.showMap && mapSrc && (
                    <div className={s.map}>
                      <iframe
                        title="map"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={mapSrc ?? undefined}
                      />
                      {mapHref && (
                        <a
                          className={s.btn}
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t.mapBtn}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Gallery */}
          {data.galleryUrls.length > 0 && (
            <>
              <Join />
              <section id={`${idPrefix}gallery`} className={s.panel}>
                <Corners />
                <h2 className={s.secTitle}>កម្រងរូបភាព</h2>
                <p className={s.secEn}>Gallery</p>
                <div className={s.gallery}>
                  {data.galleryUrls.map((src) => (
                    <figure key={src}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                      <img src={src} alt="" loading="lazy" />
                    </figure>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ចំណងដៃ: bank KHQR */}
          {hasGiftQr(data) && (
            <>
              <Join />
              <section id={`${idPrefix}gift`} className={s.panel}>
                <Corners />
                <h2 className={s.secTitle}>{giftQrTitle("km")}</h2>
                <p className={s.secEn}>Gift via KHQR</p>
                <GiftQr data={data} lang={lang} accent={data.themeColor} />
              </section>
            </>
          )}

          {/* 5. RSVP */}
          {data.showRsvp && (
            <>
              <Join />
              <section id={`${idPrefix}rsvp`} className={s.panel}>
                <Corners />
                <h2 className={s.secTitle}>បញ្ជាក់ការចូលរួម</h2>
                <p className={s.secEn}>Confirm Your Attendance</p>
                <RsvpForm data={data} t={t} />
              </section>
            </>
          )}

          {/* 6. Footer */}
          <footer id={`${idPrefix}footer`} className={s.footer}>
            <div className={s.gold}>
              <Flourish />
            </div>
            <p className={s.thanks}>
              សូមអរគុណចំពោះការចូលរួមក្នុងថ្ងៃដ៏មានន័យរបស់យើង
            </p>
            <p className={s.thanksEn}>
              Thank you for being a part of our special day!
            </p>
            <div className={s.share}>
              <button
                type="button"
                onClick={share("https://www.facebook.com/sharer/sharer.php?u=")}
                aria-label="Facebook"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2a10 10 0 0 0-1.6 19.9V15H8v-3h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v6.9A10 10 0 0 0 12 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={share("https://t.me/share/url?url=")}
                aria-label="Telegram"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 6.8-1.6 7.7c-.1.6-.5.7-1 .4l-2.6-1.9-1.3 1.2c-.1.1-.3.3-.6.3l.2-2.7 4.8-4.4c.2-.2 0-.3-.3-.1l-6 3.8-2.6-.8c-.6-.2-.6-.6.1-.8l10-3.9c.5-.2.9.1.9.8z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={t.copied}
                title={t.copied}
                onClick={() =>
                  navigator.clipboard?.writeText(window.location.href)
                }
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </svg>
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- static template art */}
            <img className={s.footGarland} src={`${ART}/garland.png`} alt="" />
          </footer>
        </>
      )}

      {data.musicUrl && (
        <MusicButton
          src={data.musicUrl}
          labels={[tx.playMusic, tx.pauseMusic]}
          autoPlayOnTap={autoPlayOnTap}
        />
      )}
    </div>
  );
}
