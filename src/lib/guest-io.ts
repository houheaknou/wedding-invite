import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { Guest, GuestSide, GuestStatus } from "@prisma/client";
import { dicts, type Dict } from "@/lib/i18n";
import { SIDES, STATUSES } from "@/lib/constants";

export { SIDES, STATUSES };

type Field = "name" | "phone" | "side" | "group" | "invitedCount" | "status" | "notes";
const FIELDS: Field[] = ["name", "phone", "side", "group", "invitedCount", "status", "notes"];

export type ImportedGuest = {
  name: string;
  phone: string | null;
  side: GuestSide;
  group: string | null;
  invitedCount: number;
  status: GuestStatus;
  notes: string | null;
};

const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();

// Header aliases: the labels of every UI language plus plain English keys,
// so a file exported in Khmer re-imports fine in English and vice versa.
const HEADER_ALIASES: Record<Field, Set<string>> = Object.fromEntries(
  FIELDS.map((f) => {
    const aliases = new Set<string>([norm(f)]);
    for (const d of Object.values(dicts)) aliases.add(norm(d[f]));
    return [f, aliases];
  }),
) as Record<Field, Set<string>>;
HEADER_ALIASES.phone.add("tel").add("mobile").add("phone number");
HEADER_ALIASES.invitedCount.add("count").add("people").add("guests").add("ចំនួន");
HEADER_ALIASES.notes.add("note").add("ចំណាំ");
HEADER_ALIASES.name.add("full name").add("guest").add("ឈ្មោះភ្ញៀវ");

function parseSide(raw: string): GuestSide {
  const v = norm(raw);
  if (!v) return "BOTH";
  for (const side of SIDES) {
    if (v === side.toLowerCase()) return side;
    for (const d of Object.values(dicts)) if (v === norm(d[`side_${side}`])) return side;
  }
  if (/bride|ស្រី|ក្រមុំ/.test(v)) return "BRIDE";
  if (/groom|ប្រុស|កំលោះ/.test(v)) return "GROOM";
  return "BOTH";
}

function parseStatus(raw: string): GuestStatus {
  const v = norm(raw);
  for (const status of STATUSES) {
    if (v === status.toLowerCase()) return status;
    for (const d of Object.values(dicts)) if (v === norm(d[`status_${status}`])) return status;
  }
  return "PENDING";
}

function parseCount(raw: string) {
  // Accept Khmer digits too (០-៩)
  const ascii = raw.replace(/[០-៩]/g, (c) => String(c.charCodeAt(0) - 0x17e0));
  const n = Number.parseInt(ascii, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 999) : 1;
}

export function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text);
    if ("result" in value) return value.result == null ? "" : String(value.result);
    return "";
  }
  return String(value);
}

/** First sheet (or the CSV) as rows of trimmed-to-string cells; also used by the expense import */
export async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return parsed.data.map((row) => row.map((c) => String(c ?? "")));
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col - 1] = cellToString(cell.value);
    });
    rows.push(Array.from(cells, (c) => c ?? ""));
  });
  return rows;
}

export function isSupportedFile(file: File) {
  return /\.(xlsx|csv)$/i.test(file.name);
}

export async function parseGuestFile(
  file: File,
): Promise<{ ok: true; guests: ImportedGuest[]; skipped: number } | { ok: false }> {
  const rows = await readRows(file);
  // The header row is the first one that has a recognisable Name column
  const headerIndex = rows.findIndex((r) => r.some((c) => HEADER_ALIASES.name.has(norm(c))));
  if (headerIndex < 0) return { ok: false };

  const columns = new Map<Field, number>();
  rows[headerIndex].forEach((cell, i) => {
    const h = norm(cell);
    for (const f of FIELDS) if (!columns.has(f) && HEADER_ALIASES[f].has(h)) columns.set(f, i);
  });
  const get = (row: string[], f: Field) => {
    const i = columns.get(f);
    return i === undefined ? "" : (row[i] ?? "").trim();
  };

  const guests: ImportedGuest[] = [];
  let skipped = 0;
  for (const row of rows.slice(headerIndex + 1)) {
    const name = get(row, "name");
    if (!name) {
      if (row.some((c) => c.trim())) skipped++;
      continue;
    }
    guests.push({
      name: name.slice(0, 200),
      phone: get(row, "phone") || null,
      side: parseSide(get(row, "side")),
      group: get(row, "group") || null,
      invitedCount: parseCount(get(row, "invitedCount")),
      status: parseStatus(get(row, "status")),
      notes: get(row, "notes") || null,
    });
  }
  return { ok: true, guests, skipped };
}

function toTable(guests: Guest[], t: Dict) {
  const header = FIELDS.map((f) => t[f]);
  const body = guests.map((g) => [
    g.name,
    g.phone ?? "",
    t[`side_${g.side}`],
    g.group ?? "",
    g.invitedCount,
    t[`status_${g.status}`],
    g.notes ?? "",
  ]);
  return { header, body };
}

export async function buildXlsx(guests: Guest[], t: Dict) {
  const { header, body } = toTable(guests, t);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(t.guestList);
  sheet.addRow(header).font = { bold: true };
  body.forEach((r) => sheet.addRow(r));
  sheet.columns.forEach((col, i) => {
    col.width = [28, 16, 16, 16, 10, 16, 30][i];
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildCsv(guests: Guest[], t: Dict) {
  const { header, body } = toTable(guests, t);
  // BOM so Excel opens the UTF-8 (Khmer) text correctly
  return "\uFEFF" + Papa.unparse([header, ...body]);
}
