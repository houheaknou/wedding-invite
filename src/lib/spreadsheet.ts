import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";

/** Reading uploaded .xlsx / .csv files for the guest, expense and gift imports. */

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

/** First sheet (or the CSV) as rows of cells converted to strings */
export async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    // preview: stop parsing just past the limit instead of reading the whole file
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true, preview: IMPORT_MAX_ROWS + 1 });
    if (parsed.data.length > IMPORT_MAX_ROWS) throw new Error("too many rows");
    return parsed.data.map((row) => row.map((c) => String(c ?? "")));
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  if (sheet.actualRowCount > IMPORT_MAX_ROWS) throw new Error("too many rows");
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

/**
 * Limits for guest / expense / gift imports [review M-5]: an .xlsx is a zip, so a small upload can
 * expand to hundreds of MB inside ExcelJS. Real lists are far below both limits.
 */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;

export function isSupportedFile(file: File) {
  return /\.(xlsx|csv)$/i.test(file.name) && file.size <= IMPORT_MAX_BYTES;
}
