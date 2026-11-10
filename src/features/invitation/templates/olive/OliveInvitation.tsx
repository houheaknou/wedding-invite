"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { GiftQr, giftQrTitle, hasGiftQr } from "@/features/invitation/templates/GiftQr";
import { CalendarPlus, MapPin, Send } from "lucide-react";
import QRCode from "qrcode";
import { submitRsvp, type RsvpState } from "@/features/invitation/rsvp-actions";
import { MusicButton } from "@/features/invitation/templates/MusicButton";
import { parseAgenda } from "@/features/invitation/agenda";
import { royalFontVars } from "@/features/invitation/fonts";
import { formatInviteDate, INVITE_TEXT, type InvitationData, mapEmbedSrc, contactPhoneList } from "@/features/invitation/shared";
import s from "./olive.module.css";

const KM_DIGITS = "០១២៣៤៥៦៧៨៩";
const km = (v: string | number) => String(v).replace(/\d/g, (d) => KM_DIGITS[Number(d)]);
const period = (h: number) => (h < 12 ? "ព្រឹក" : h < 13 ? "ថ្ងៃត្រង់" : h < 17 ? "រសៀល" : h < 19 ? "ល្ងាច" : "យប់");

/** "07:00 AM" / "15:30" → Khmer "០៧:០០" + time of day, as in the programme. Other text passes through. */
function khmerTime(raw: string) {
  const m = /^(\d{1,2})[:.](\d{2})\s*([AaPp])?\.?[Mm]?\.?$/.exec(raw.trim());
  if (!m) return { time: raw, part: "" };
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  const h12 = h % 12 || 12;
  return { time: km(`${String(h12).padStart(2, "0")}:${m[2]}`), part: period(h) };
}

/** Line-drawn flower sprig for the cover card's corners */
function Flower({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 74 74" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M8 66C18 44 32 26 66 8" />
        <path d="M20 46c-7-1-11-6-11-12 7 1 11 6 11 12zM31 33c-6-2-9-7-8-13 6 2 9 7 8 13zM44 22c-5-3-7-8-5-13 5 3 7 8 5 13z" />
        <path d="M24 50c3-6 8-8 14-6-3 6-8 8-14 6zM36 37c3-5 8-7 13-5-3 5-8 7-13 5z" />
        <circle cx="16" cy="18" r="6" />
        <path d="M16 12v-4M16 24v4M10 18H6M22 18h4M12 14l-3-3M20 22l3 3M20 14l3-3M12 22l-3 3" />
        <circle cx="58" cy="40" r="4.5" />
        <path d="M58 35.5v-3M58 44.5v3M53.5 40h-3M62.5 40h3" />
      </g>
      <circle cx="16" cy="18" r="2" fill="currentColor" />
      <circle cx="58" cy="40" r="1.5" fill="currentColor" />
      <circle cx="66" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

/** Scroll divider: line with arrow tips and a double loop in the middle */
function Ornament() {
  return (
    <svg className={s.ornament} width="160" height="16" viewBox="0 0 160 16" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M6 8h56M98 8h56" />
        <path d="M2 8l6-3v6zM158 8l-6-3v6z" fill="currentColor" />
        <ellipse cx="80" cy="8" rx="12" ry="5.5" />
        <ellipse cx="80" cy="8" rx="5" ry="3" />
        <path d="M62 8c3-4 6-4 6 0M98 8c-3-4-6-4-6 0" />
      </g>
      <circle cx="66" cy="8" r="1.4" fill="currentColor" />
      <circle cx="94" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Fade-up on scroll. Content is only hidden once the observer has reported in (.ready). */
function useReveal(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const host = root.current;
    const els = host?.querySelectorAll(`.${s.reveal}`);
    if (!host || !els?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        host.classList.add(s.ready);
        entries.forEach((e) => e.isIntersecting && e.target.classList.add(s.in));
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

// Fixed leaf layout (deterministic so server and client render the same markup)
const LEAVES = Array.from({ length: 9 }, (_, i) => ({
  left: (i * 41 + 7) % 100,
  size: 14 + ((i * 5) % 8),
  dur: 13 + ((i * 7) % 9),
  delay: -((i * 11) % 19),
  drift: (i % 2 ? 1 : -1) * (30 + ((i * 13) % 50)),
}));

/** Opening: two olive "doors" with a wax seal; tapping slides them apart */
function Intro({ data }: { data: InvitationData }) {
  const [opening, setOpening] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const initial = (name: string) => Array.from(name.trim())[0] ?? "";
  return (
    <div
      className={`${s.intro} ${opening ? s.introOpen : ""}`}
      role="button"
      tabIndex={0}
      aria-label="បើកធៀប"
      onClick={() => {
        if (opening) return;
        setOpening(true);
        setTimeout(() => setGone(true), 1400);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") (e.currentTarget as HTMLDivElement).click();
      }}
    >
      <div className={`${s.door} ${s.doorL}`} />
      <div className={`${s.door} ${s.doorR}`} />
      <p className={s.introTitle}>{data.title || "សិរីសួស្តីអាពាហ៍ពិពាហ៍"}</p>
      <div className={s.seal}>
        <p>
          {initial(data.groomName)}
          <span>♥</span>
          {initial(data.brideName)}
        </p>
      </div>
      <p className={s.introText}>សូមចុចដើម្បីបើកធៀប</p>
    </div>
  );
}

function Card({ id, flowers = false, children }: { id?: string; flowers?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`${s.card} ${s.reveal}`}>
      {flowers && (
        <>
          <Flower className={`${s.flower} ${s.flowerTl}`} />
          <Flower className={`${s.flower} ${s.flowerBr}`} />
        </>
      )}
      {children}
    </section>
  );
}

function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? null : Math.max(0, new Date(iso).getTime() - now);
  const vals =
    left === null
      ? null
      : [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
  return (
    <div className={s.count}>
      {["ថ្ងៃ", "ម៉ោង", "នាទី", "វិនាទី"].map((u, i) => (
        <div key={u}>
          {/* key on the value re-mounts the number, replaying the pop as it changes */}
          <b key={vals ? vals[i] : "x"} className={s.countPop}>
            {vals ? km(String(vals[i]).padStart(2, "0")) : "--"}
          </b>
          <span>{u}</span>
        </div>
      ))}
    </div>
  );
}

function Qr({ value }: { value: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, color: { dark: "#3d3a10", light: "#0000" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [value]);
  // SVG generated locally by the qrcode library
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Google Calendar "add event" link (4-hour slot) */
function calendarUrl(data: InvitationData) {
  const start = new Date(data.startsAt);
  const end = new Date(start.getTime() + 4 * 3600_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${data.groomName} & ${data.brideName}`,
    dates: `${f(start)}/${f(end)}`,
    location: [data.venue, data.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function Rsvp({ data }: { data: InvitationData }) {
  const target = data.rsvp;
  const [state, action, pending] = useActionState<RsvpState, FormData>(
    target ? submitRsvp.bind(null, target.shareId, target.guestId) : async () => undefined,
    undefined,
  );
  // In builder previews this sits inside the builder's <form>: unnamed, non-required fields
  const n = (name: string) => (target ? name : undefined);
  const err =
    state?.error === "name"
      ? "សូមបញ្ចូលឈ្មោះ"
      : state?.error === "phone"
        ? "សូមបញ្ចូលលេខទូរស័ព្ទ"
        : state?.error === "limit"
          ? "ផ្ញើច្រើនដងពេក សូមព្យាយាមម្តងទៀតពេលក្រោយ"
          : state?.error
            ? "ការឆ្លើយតបត្រូវបានបិទ"
            : null;
  const fields = (
    <>
      {target && <input className={s.hp} name="website" tabIndex={-1} autoComplete="off" aria-hidden />}
      <div className={s.choices}>
        {(
          [
            ["YES", "ចូលរួម"],
            ["NO", "មិនបាន"],
            ["MAYBE", "មិនទាន់ប្រាកដ"],
          ] as const
        ).map(([v, l]) => (
          <label key={v}>
            <input type="radio" name={target ? "answer" : "olive-preview"} value={v} defaultChecked={v === "YES"} />
            {l}
          </label>
        ))}
      </div>
      <input name={n("name")} required={!!target} defaultValue={data.guestName ?? ""} placeholder="ឈ្មោះរបស់អ្នក" />
      <input name={n("phone")} type="tel" required={!!target} placeholder="លេខទូរស័ព្ទ" />
      <select name={n("count")} defaultValue="1" aria-label="ចំនួនមនុស្ស">
        {[1, 2, 3, 4, 5, 6].map((c) => (
          <option key={c} value={c}>
            ចំនួនមនុស្ស: {km(c)}
          </option>
        ))}
      </select>
      <textarea name={n("message")} rows={2} placeholder="សារជូនពរ (ស្រេចចិត្ត)" />
      <div style={{ textAlign: "center" }}>
        <button className={s.btn} type={target ? "submit" : "button"} disabled={pending || state?.ok}>
          <Send size={14} />
          {state?.ok ? "✓" : "ផ្ញើការឆ្លើយតប"}
        </button>
      </div>
      {state?.ok && <p className={s.msg}>សូមអរគុណ! យើងបានទទួលការឆ្លើយតបរបស់អ្នកហើយ។</p>}
      {err && <p className={`${s.msg} ${s.err}`}>{err}</p>}
      {!target && <p className={s.msg}>មើលជាមុន — ទម្រង់នេះដំណើរការនៅលើតំណដែលបានចែករំលែក។</p>}
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

export function OliveInvitation({
  data,
  autoPlayOnTap = false,
  idPrefix = "r-",
  gate = false,
}: {
  data: InvitationData;
  autoPlayOnTap?: boolean;
  idPrefix?: string;
  /** Public link: start behind the door + wax-seal opening */
  gate?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  const tx = INVITE_TEXT.km;
  const id = (x: string) => `${idPrefix}${x}`;
  const days = parseAgenda(data.agenda).filter((d) => d.items.length);
  const mapQuery = [data.venueEn ?? data.venue, data.address].filter(Boolean).join(", ");
  const mapHref = data.mapUrl ?? (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null);
  const mapSrc = mapEmbedSrc(data);
  const phones = contactPhoneList(data.contactPhones);
  const dateLine = formatInviteDate(data.startsAt, "km");
  const dateOnly = dateLine.split(" វេលាម៉ោង")[0];

  return (
    <div ref={rootRef} className={`${s.root} ${royalFontVars}`}>
      {gate && <Intro data={data} />}
      <div className={s.sparkles} aria-hidden />
      <div className={s.sparkles2} aria-hidden />
      <div className={s.leaves} aria-hidden>
        <div>
          {LEAVES.map((l, i) => (
            <span
              key={i}
              className={s.leafFall}
              style={
                {
                  left: `${l.left}%`,
                  "--size": `${l.size}px`,
                  "--dur": `${l.dur}s`,
                  "--delay": `${l.delay}s`,
                  "--drift": `${l.drift}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
      {/* 1. Cover card: title, names, date (+ lunar date), countdown */}
      <Card id={id("home")} flowers>
        {data.titleEnabled && <h1 className={s.title}>{data.title || "សិរីសួស្តីអាពាហ៍ពិពាហ៍"}</h1>}
        <Ornament />
        <div className={s.names}>
          <div>
            <p className={s.label}>កូនប្រុសនាម</p>
            <p className={s.name}>{data.groomName}</p>
            {data.groomNameEn && <p className={s.nameEn}>{data.groomNameEn}</p>}
          </div>
          <span className={s.heart}>♥</span>
          <div>
            <p className={s.label}>កូនស្រីនាម</p>
            <p className={s.name}>{data.brideName}</p>
            {data.brideNameEn && <p className={s.nameEn}>{data.brideNameEn}</p>}
          </div>
        </div>
        <p className={s.dateBold} suppressHydrationWarning>
          {dateOnly}
        </p>
        {data.lunarDate && <p className={s.lunar}>{data.lunarDate}</p>}
        {data.showCountdown && <Countdown iso={data.startsAt} />}
      </Card>

      {/* 2. Invitation card: parents, wording, date/time, venue */}
      <Card id={id("invitation")}>
        {data.showParents && (data.groomParents || data.brideParents) && (
          <div className={s.parents}>
            <p>{data.groomParents}</p>
            <p>{data.brideParents}</p>
          </div>
        )}
        <h2 className={s.invite}>{tx.invite}</h2>
        {data.guestName && <p className={s.guest}>{data.guestName}</p>}
        <p className={s.wording}>{data.message || tx.message}</p>
        <p className={s.when} suppressHydrationWarning>
          {dateLine}
        </p>
        {(data.venue || data.address) && <p className={s.where}>{[data.venue, data.address].filter(Boolean).join("\n")}</p>}
        <p className={s.thanks}>សូមអរគុណ</p>
      </Card>

      {/* 3. Programme */}
      {data.showAgenda && days.length > 0 && (
        <Card id={id("programme")}>
          <h2 className={s.title}>កម្មវិធីសិរីសួស្តីអាពាហ៍ពិពាហ៍</h2>
          <Ornament />
          {days.map((day, i) => (
            <div key={i}>
              {(day.title || day.date) && <p className={s.dayHead}>{[day.title, day.date].filter(Boolean).join(" • ")}</p>}
              {day.items.map((it, j) => {
                const t = khmerTime(it.time);
                return (
                  <div key={j} className={`${s.row} ${s.reveal}`} style={{ "--i": j } as CSSProperties}>
                    <span className={s.time}>
                      <b>{t.time}</b>
                      {t.part && <small>{t.part}</small>}
                    </span>
                    <span>{it.text}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      )}

      {/* 4. Gallery */}
      {data.galleryUrls.length > 0 && (
        <Card id={id("gallery")}>
          <h2 className={s.title}>កម្រងរូបភាព</h2>
          <Ornament />
          <div className={s.gallery}>
            {data.galleryUrls.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element -- user upload
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
        </Card>
      )}

      {/* 5. Venue map, QR, calendar, contacts, signature */}
      {data.showDetails && (
        <Card id={id("venue")}>
          <h2 className={s.title}>ប្លង់ផ្ទះការ</h2>
          {(data.venuePhotoUrl || (data.showMap && mapSrc)) && (
            <div className={s.plan}>
              {data.venuePhotoUrl ? (
                <a href={data.venuePhotoUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user upload (the couple's own venue map) */}
                  <img src={data.venuePhotoUrl} alt="ប្លង់ផ្ទះការ" />
                </a>
              ) : (
                <iframe title="map" loading="lazy" src={mapSrc ?? undefined} />
              )}
              {mapHref && (
                <div className={s.qr}>
                  <Qr value={mapHref} />
                  ស្កេនមើលទីតាំង
                </div>
              )}
            </div>
          )}
          {data.venuePhotoUrl && <p className={s.hint}>ចុចលើប្លង់ដើម្បីពង្រីក</p>}
          <div className={s.btns}>
            {mapHref && (
              <a className={s.btn} href={mapHref} target="_blank" rel="noopener noreferrer">
                <MapPin size={14} />
                បើកផែនទី Google
              </a>
            )}
            <a className={s.btnOutline} href={calendarUrl(data)} target="_blank" rel="noopener noreferrer">
              <CalendarPlus size={14} />
              ដាក់ក្នុងប្រតិទិន
            </a>
          </div>
          {phones.length > 0 && (
            <>
              <h3 className={s.contactsTitle}>ទំនាក់ទំនងម្ចាស់ដើមការ</h3>
              <div className={s.phones}>
                {phones.map(({ label, tel }) => (
                  <a key={tel} href={`tel:${tel}`}>
                    {label}
                  </a>
                ))}
              </div>
            </>
          )}
          <Ornament />
          <p className={s.signature}>
            {data.groomName}
            <span>♥</span>
            {data.brideName}
          </p>
        </Card>
      )}

      {/* ចំណងដៃ: bank KHQR */}
      {hasGiftQr(data) && (
        <Card id={id("gift")}>
          <h2 className={s.title}>{giftQrTitle(data.lang)}</h2>
          <Ornament />
          <GiftQr data={data} lang={data.lang} accent="#6b6b20" />
        </Card>
      )}

      {/* 6. RSVP */}
      {data.showRsvp && (
        <Card id={id("rsvp")}>
          <h2 className={s.title}>បញ្ជាក់ការចូលរួម</h2>
          <Ornament />
          <Rsvp data={data} />
        </Card>
      )}

      {data.musicUrl && <MusicButton src={data.musicUrl} labels={[tx.playMusic, tx.pauseMusic]} autoPlayOnTap={autoPlayOnTap} />}
    </div>
  );
}
