// Input parsing shared by the server actions and the spreadsheet imports [review L-2].

/** Khmer digits (០-៩) → ASCII digits. */
export const khmerDigitsToAscii = (s: string) => s.replace(/[០-៩]/g, (c) => String(c.charCodeAt(0) - 0x17e0));

/**
 * A number as people type it in a sheet or a form: "$ 1,250.00" · "1 250" · "៥០" · "100000៛" · "50 usd".
 * Blank or "-" (an empty money cell) → null; anything else that isn't a number → null.
 */
export function parseNumber(raw: string): number | null {
  const s = khmerDigitsToAscii(raw).replace(/[$៛,\s]|usd|khr|riel/gi, "");
  if (!s || /^-+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Round to cents. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Trimmed text field, cut to `max` characters ("" when missing). */
export const str = (fd: FormData, key: string, max?: number) => String(fd.get(key) ?? "").trim().slice(0, max);

/** Trimmed text field, cut to `max` characters; null when blank. */
export const opt = (fd: FormData, key: string, max?: number) => str(fd, key, max) || null;

/**
 * A money field: cents-rounded and below a trillion. null when blank, not a number, negative, or
 * zero unless `allowZero`.
 */
export function money(fd: FormData, key: string, { allowZero = true } = {}): number | null {
  const n = parseNumber(String(fd.get(key) ?? ""));
  if (n === null || n < 0 || n >= 1e12 || (!allowZero && n === 0)) return null;
  return round2(n);
}
