import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { GiftMethod, GuestSide } from "@prisma/client";
import { dicts, type Dict } from "@/lib/i18n";
import { readRows } from "@/lib/guest-io";
import { GIFT_METHODS, GIFT_SIDES, giftTotals } from "@/lib/gifts";
import { parseNumber, round2 } from "@/lib/parse";

/**
 * Gift book import/export. Khmer gift lists usually keep dollars and riel in two columns
 * (ដុល្លារ · រៀល); a single Amount column with a Currency column works too. A row with both
 * a $ and a ៛ amount becomes two gifts.
 */

type Field = "name" | "usd" | "khr" | "amount" | "currency" | "side" | "method" | "notes";
const FIELDS: Field[] = ["name", "usd", "khr", "amount", "currency", "side", "method", "notes"];
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

const ALIASES: Record<Field, Set<string>> = {
  name: new Set(["name", "guest", "guest name", "from", "ឈ្មោះ", "ឈ្មោះភ្ញៀវ", "ឈ្មោះអ្នកផ្តល់", "ភ្ញៀវ", "ឈ្មោះ-គោត្តនាម"]),
  usd: new Set(["usd", "$", "dollar", "dollars", "amount ($)", "amount (usd)", "ដុល្លារ", "ដុល្លារ ($)", "ប្រាក់ដុល្លារ"]),
  khr: new Set(["khr", "៛", "riel", "riels", "amount (៛)", "amount (khr)", "រៀល", "រៀល (៛)", "ប្រាក់រៀល"]),
  amount: new Set(["amount", "gift", "money", "ចំនួនទឹកប្រាក់", "ទឹកប្រាក់", "ចំណងដៃ", "ចំនួន"]),
  currency: new Set(["currency", "រូបិយប័ណ្ណ"]),
  side: new Set(["side", "ខាង"]),
  method: new Set(["method", "payment", "via", "ប្រភេទ", "វិធីសាស្ត្រ", "តាមរយៈ"]),
  notes: new Set(["note", "notes", "remark", "កំណត់ចំណាំ", "ចំណាំ"]),
};
for (const d of Object.values(dicts)) {
  ALIASES.name.add(norm(d.giftFrom));
  ALIASES.usd.add(norm(d.giftUsdColumn));
  ALIASES.khr.add(norm(d.giftKhrColumn));
  ALIASES.side.add(norm(d.side));
  ALIASES.method.add(norm(d.giftMethod));
  ALIASES.notes.add(norm(d.notes));
}
const isTotal = (s: string) => ["total", "សរុប", "grand total", ...Object.values(dicts).map((d) => norm(d.subtotal))].includes(norm(s));

/** A gift amount: positive, cents-rounded; null otherwise */
function num(raw: string): number | null {
  const n = parseNumber(raw);
  return n !== null && n > 0 ? round2(n) : null;
}

function parseSide(raw: string): GuestSide | null {
  const v = norm(raw);
  if (!v) return null;
  for (const s of GIFT_SIDES) {
    if (v === s.toLowerCase()) return s;
    for (const d of Object.values(dicts)) if (v === norm(d[`side_${s}`])) return s;
  }
  if (/bride|ស្រី|ក្រមុំ/.test(v)) return "BRIDE";
  if (/groom|ប្រុស|កំលោះ/.test(v)) return "GROOM";
  return null;
}

function parseMethod(raw: string): GiftMethod {
  const v = norm(raw);
  for (const m of GIFT_METHODS) {
    if (v === m.toLowerCase()) return m;
    for (const d of Object.values(dicts)) if (v === norm(d[`method_${m}`])) return m;
  }
  if (/aba|bank|acleda|wing|transfer|khqr|ធនាគារ|ផ្ទេរ/.test(v)) return "BANK";
  return "CASH";
}

export type ImportedGift = { name: string; amount: number; currency: string; side: GuestSide | null; method: GiftMethod; notes: string | null };

export async function parseGiftFile(file: File): Promise<{ ok: true; gifts: ImportedGift[] } | { ok: false }> {
  const rows = (await readRows(file)).map((r) => r.map((c) => (c ?? "").trim()));
  const headerCols = (row: string[]) => {
    const cols = new Map<Field, number>();
    row.forEach((cell, i) => {
      const h = norm(cell);
      for (const f of FIELDS) if (!cols.has(f) && ALIASES[f].has(h)) cols.set(f, i);
    });
    return cols.has("name") && (cols.has("usd") || cols.has("khr") || cols.has("amount")) ? cols : null;
  };
  const headerIndex = rows.findIndex((r) => headerCols(r));
  if (headerIndex < 0) return { ok: false };
  const cols = headerCols(rows[headerIndex])!;
  const get = (row: string[], f: Field) => {
    const i = cols.get(f);
    return i === undefined ? "" : (row[i] ?? "");
  };

  const gifts: ImportedGift[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const name = get(row, "name");
    if (!name || isTotal(name)) continue;
    const base = { name: name.slice(0, 120), side: parseSide(get(row, "side")), method: parseMethod(get(row, "method")), notes: get(row, "notes").slice(0, 500) || null };
    const usd = num(get(row, "usd"));
    const khr = num(get(row, "khr"));
    const amount = num(get(row, "amount"));
    if (usd) gifts.push({ ...base, amount: usd, currency: "USD" });
    if (khr) gifts.push({ ...base, amount: khr, currency: "KHR" });
    if (!usd && !khr && amount) {
      const c = norm(get(row, "currency"));
      const raw = get(row, "amount");
      const isKhr = /khr|៛|riel|រៀល/.test(c) || raw.includes("៛") || (!c && amount >= 1000 && !raw.includes("$"));
      gifts.push({ ...base, amount, currency: isKhr ? "KHR" : "USD" });
    }
  }
  return { ok: true, gifts };
}

export type ExportGift = { name: string; amount: number; currency: string; side: GuestSide; method: GiftMethod; notes: string | null };

function table(gifts: ExportGift[], t: Dict) {
  const header = ["No", t.giftFrom, t.side, t.giftUsdColumn, t.giftKhrColumn, t.giftMethod, t.notes];
  const body = gifts.map((g, i) => [
    i + 1,
    g.name,
    t[`side_${g.side}`],
    g.currency === "KHR" ? "" : g.amount,
    g.currency === "KHR" ? g.amount : "",
    t[`method_${g.method}`],
    g.notes ?? "",
  ]);
  return { header, body };
}

export async function buildGiftXlsx(gifts: ExportGift[], t: Dict, title: string) {
  const { header, body } = table(gifts, t);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t.tabGifts, { views: [{ showGridLines: false, state: "frozen", ySplit: 3 }] });
  ws.columns = [6, 30, 18, 13, 16, 18, 30].map((width) => ({ width }));
  const thin = { style: "thin", color: { argb: "FFD9C7A0" } } as const;
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const usdFmt = '"$"#,##0.00;-"$"#,##0.00;""';
  const khrFmt = '#,##0" ៛";-#,##0" ៛";""';

  const titleRow = ws.addRow(["", title]);
  titleRow.font = { bold: true, italic: true, size: 14 };
  ws.mergeCells(titleRow.number, 2, titleRow.number, 7);
  ws.addRow([]);
  const h = ws.addRow(header);
  h.eachCell((c) => {
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3DEA3" } };
    c.border = box;
    c.alignment = { horizontal: "center" };
  });
  const first = ws.rowCount + 1;
  body.forEach((r) => {
    const row = ws.addRow(r);
    row.getCell(4).numFmt = usdFmt;
    row.getCell(5).numFmt = khrFmt;
    row.eachCell({ includeEmpty: true }, (c) => (c.border = box));
  });
  const last = ws.rowCount;
  const { usd, khr } = giftTotals(gifts);
  const total = ws.addRow(["", t.subtotal.toUpperCase(), "", gifts.length ? { formula: `SUM(D${first}:D${last})`, result: usd } : 0, gifts.length ? { formula: `SUM(E${first}:E${last})`, result: khr } : 0]);
  total.font = { bold: true };
  total.getCell(4).numFmt = '"$"#,##0.00';
  total.getCell(5).numFmt = '#,##0" ៛"';
  for (let c = 1; c <= 7; c++) {
    total.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF8EC" } };
    total.getCell(c).border = box;
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildGiftCsv(gifts: ExportGift[], t: Dict) {
  const { header, body } = table(gifts, t);
  return "﻿" + Papa.unparse([header, ...body]);
}
