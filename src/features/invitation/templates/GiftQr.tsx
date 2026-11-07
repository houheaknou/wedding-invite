"use client";

import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import type { InvitationData, InviteLang } from "@/features/invitation/shared";

/**
 * ចងដៃតាមរយៈ KHQR on the invitation: a USD | រៀល switch and one white card with the couple's
 * bank KHQR for that currency ("Scan. Pay. Done."), the account name under it, and a small line with
 * bank + copyable account number. Guests scan it with their banking app, or — on the same phone —
 * save the image and open it from the app. Shared by every template; each adds its own heading.
 */
const TEXT = {
  km: { usd: "USD", khr: "រៀល", copied: "បានចម្លង", copy: "ចម្លងលេខគណនី", save: "រក្សាទុករូប QR", zoom: "ពង្រីក", close: "បិទ" },
  en: { usd: "USD", khr: "Riel", copied: "Copied", copy: "Copy account number", save: "Save QR image", zoom: "Enlarge", close: "Close" },
};

type Option = { key: "usd" | "khr"; qr: string | null; bank: string | null; name: string | null; account: string | null };

function giftQrOptions(data: InvitationData): Option[] {
  return (
    [
      { key: "usd", qr: data.khqrUsdUrl, bank: data.giftUsdBank, name: data.giftUsdName, account: data.giftUsdAccount },
      { key: "khr", qr: data.khqrKhrUrl, bank: data.giftKhrBank, name: data.giftKhrName, account: data.giftKhrAccount },
    ] as Option[]
  ).filter((o) => o.qr);
}

/** Whether the invitation should show the gift section at all (needs at least one QR image) */
export const hasGiftQr = (data: InvitationData) => data.showGiftQr && giftQrOptions(data).length > 0;

/** Section title, as in the reference: "ចងដៃតាមរយៈ KHQR" */
export const giftQrTitle = (lang: InviteLang) => (lang === "en" ? "Gift via KHQR" : "ចងដៃតាមរយៈ KHQR");

export function GiftQr({ data, lang, accent = "#b8862f" }: { data: InvitationData; lang: InviteLang; accent?: string }) {
  const t = TEXT[lang];
  const options = giftQrOptions(data);
  const [pick, setPick] = useState<"usd" | "khr">(options[0]?.key ?? "usd");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);
  const o = options.find((x) => x.key === pick) ?? options[0];
  if (!o) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(o.account!.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the number is still visible to copy by hand */
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center gap-4">
      {/* USD | រៀល — only when both accounts are set */}
      {options.length > 1 && (
        <div role="tablist" className="inline-flex rounded-full p-1 shadow-inner" style={{ background: `color-mix(in srgb, ${accent} 18%, white)` }}>
          {options.map((x) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={x.key === o.key}
              onClick={() => setPick(x.key)}
              className="min-w-16 rounded-full px-4 py-1.5 text-sm font-bold transition"
              style={x.key === o.key ? { background: accent, color: "#fff", boxShadow: "0 2px 6px rgb(0 0 0 / .15)" } : { color: accent }}
            >
              {t[x.key]}
            </button>
          ))}
        </div>
      )}

      {/* the card */}
      {/* cream card tinted with the template's accent, so it sits in the invitation instead of a white box */}
      <div
        className="w-full rounded-3xl border px-5 pb-4 pt-3 text-center shadow-[0_6px_24px_rgb(0_0_0/0.06)]"
        style={{
          background: `color-mix(in srgb, ${accent} 7%, #fffaf0)`,
          borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
        }}
      >
        <p className="mb-2 text-sm font-medium italic text-stone-700">Scan. Pay. Done.</p>
        {/* QR inside scanner-style corner brackets, filling the card */}
        <button type="button" onClick={() => setZoom(true)} aria-label={t.zoom} className="relative mx-auto block aspect-square w-full p-3">
          {(["left-0 top-0 rounded-tl-2xl border-l-4 border-t-4", "right-0 top-0 rounded-tr-2xl border-r-4 border-t-4", "bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4", "bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4"] as const).map((c) => (
            <span key={c} aria-hidden className={`absolute size-9 ${c}`} style={{ borderColor: `color-mix(in srgb, ${accent} 45%, transparent)` }} />
          ))}
          {/* multiply: the QR's white takes the card's cream, the dark modules stay dark (still scans);
              the enlarged view and the saved file stay plain black-on-white */}
          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded KHQR */}
          <img key={o.qr} src={o.qr!} alt={`KHQR ${t[o.key]}`} className="size-full object-contain mix-blend-multiply" loading="lazy" />
        </button>
        {o.name && <p className="mt-2 text-base font-bold text-stone-800">{o.name}</p>}
        {(o.bank || o.account) && (
          <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-stone-500">
            {o.bank && <span className="font-semibold uppercase tracking-wide" style={{ color: accent }}>{o.bank}</span>}
            {o.bank && o.account && <span>·</span>}
            {o.account && (
              <button type="button" onClick={copy} title={t.copy} className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-stone-700 hover:underline">
                {o.account}
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3 text-stone-400" />}
                <span className="sr-only">{copied ? t.copied : t.copy}</span>
              </button>
            )}
          </p>
        )}
      </div>

      <a href={o.qr!} download={`KHQR-${o.key.toUpperCase()}.png`} className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: accent }}>
        <Download className="size-3.5" />
        {t.save}
      </a>

      {zoom && (
        <div role="dialog" aria-modal onClick={() => setZoom(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <button type="button" aria-label={t.close} className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-stone-700">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded KHQR */}
          <img src={o.qr!} alt="KHQR" className="max-h-[80vh] max-w-full rounded-2xl bg-white p-3" />
        </div>
      )}
    </div>
  );
}
