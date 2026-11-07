import "server-only";
import { isGoogleMapsUrl } from "@/features/invitation/shared";

/**
 * Turn a pasted Google Maps link (incl. short maps.app.goo.gl share links) into the embeddable
 * `maps.google.com/maps?…&output=embed` URL, so the couple only has to paste the link —
 * no screenshot of the map to upload. Google won't frame share links themselves, and an iframe
 * that reaches the embed URL through a redirect stays blank, so this runs while the page loads.
 */

const DAY = 60 * 60 * 24;

const isGoogle = (url: string) => isGoogleMapsUrl(url) || /^https:\/\/(www\.)?google\.[a-z.]+\//i.test(url);

/** Follow Google's own redirects only (never off Google), at most 5 hops. */
async function expand(url: string): Promise<string> {
  let current = url;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(4000), next: { revalidate: DAY } });
    const next = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !next) return current;
    const resolved = new URL(next, current).toString();
    if (!isGoogle(resolved)) return current;
    current = resolved;
  }
  return current;
}

/** Pick the most precise location the (expanded) link carries. */
export function embedFromLink(link: string): string | null {
  const u = new URL(link);
  const embed = (q: string) => `https://maps.google.com/maps?${q}&z=16&output=embed`;
  const raw = decodeURIComponent(u.pathname + u.search);

  const pin = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/); // exact place pin
  const at = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/); // viewport centre
  const place = u.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const query = u.searchParams.get("q") ?? u.searchParams.get("query") ?? u.searchParams.get("daddr");
  const name = place ? decodeURIComponent(place.replace(/\+/g, " ")) : query;

  // exact coordinates first; else the place name — a plain `q=` search embed drops Google's red pin
  // on the place (adding `ftid` would show the place card view without the pin)
  if (pin) return embed(`q=${pin[1]},${pin[2]}`);
  if (name) return embed(`q=${encodeURIComponent(name)}`);
  if (at) return embed(`q=${at[1]},${at[2]}`);
  return null;
}

/**
 * The link guests open: the expanded place link without its query string. Share links from the
 * Maps app carry the sharer's tracking data (entry=gps, g_ep, skid…) and land some desktop
 * browsers on a blank page; the place path + data segment alone opens the same place cleanly.
 */
export function openLinkFrom(link: string): string | null {
  const u = new URL(link);
  if (!/^(www\.)?google\.[a-z.]+$/i.test(u.hostname) || !u.pathname.startsWith("/maps/place/")) return null;
  return `https://www.google.com${u.pathname}`;
}

type MapLinks = { embed: string | null; href: string | null };
const memo = new Map<string, MapLinks>();

/** Embeddable map URL + clean link for the event's map link (nulls: not Google / no location / offline). */
export async function resolveMapLinks(mapUrl: string | null): Promise<MapLinks> {
  if (!isGoogleMapsUrl(mapUrl)) return { embed: null, href: null };
  const hit = memo.get(mapUrl);
  if (hit) return hit;
  let result: MapLinks;
  try {
    const expanded = await expand(mapUrl);
    result = { embed: embedFromLink(expanded), href: openLinkFrom(expanded) };
  } catch {
    return { embed: null, href: null }; // network hiccup: don't memoise, try again next load
  }
  if (memo.size > 500) memo.clear();
  memo.set(mapUrl, result);
  return result;
}

export const resolveMapEmbed = async (mapUrl: string | null) => (await resolveMapLinks(mapUrl)).embed;
