import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { ExpenseCategory } from "@prisma/client";
import { dicts, type Dict } from "@/lib/i18n";
import { readRows } from "@/lib/guest-io";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { parseNumber, round2 } from "@/lib/parse";

/**
 * Budget-sheet import/export. The layout follows the couple's own Excel plan: one table per group
 * ("Group 1", "Group 2"…) with columns No · Description · Amount(=quantity) · Price · Total · Deposit · Note,
 * a TOTAL row under each table and a grand total at the top. A flat CSV (with a Group column) works too.
 */

type Field = "no" | "title" | "group" | "quantity" | "price" | "total" | "paid" | "category" | "vendor" | "due" | "notes";
const FIELDS: Field[] = ["no", "title", "group", "quantity", "price", "total", "paid", "category", "vendor", "due", "notes"];

const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const ALIASES: Record<Field, Set<string>> = {
  no: new Set(["no", "no.", "#", "nº", "ល.រ", "ល.រ.", "លរ", "ល/រ"]),
  title: new Set(["description", "discription", "item", "items", "expense", "name", "ចំណាយ", "ឈ្មោះ", "បរិយាយ", "មុខទំនិញ", "ការចំណាយ"]),
  group: new Set(["group", "section", "ក្រុម", "ផ្នែក"]),
  quantity: new Set(["amount", "qty", "quantity", "ចំនួន", "បរិមាណ"]),
  price: new Set(["price", "unit price", "unit cost", "តម្លៃ", "តម្លៃរាយ", "តម្លៃឯកតា"]),
  total: new Set(["total", "total cost", "សរុប", "តម្លៃសរុប"]),
  paid: new Set(["deposit", "paid", "paid so far", "ប្រាក់កក់", "បានបង់", "កក់"]),
  category: new Set(["category", "type", "ប្រភេទ"]),
  vendor: new Set(["vendor", "supplier", "shop", "អ្នកផ្គត់ផ្គង់", "ហាង"]),
  due: new Set(["due", "due date", "date", "ថ្ងៃត្រូវបង់", "កាលបរិច្ឆេទ"]),
  notes: new Set(["note", "notes", "remark", "remarks", "កំណត់ចំណាំ", "ចំណាំ"]),
};
// …plus every UI label, so a file exported in Khmer re-imports in English and vice versa
for (const d of Object.values(dicts)) {
  const labels: Partial<Record<Field, string>> = {
    title: d.expenseTitle,
    group: d.expenseGroup,
    quantity: d.expenseQuantity,
    price: d.expenseUnitPrice,
    total: d.expenseAmount,
    paid: d.expensePaid,
    category: d.expenseCategory,
    vendor: d.expenseVendor,
    due: d.expenseDue,
    notes: d.notes,
  };
  for (const [f, label] of Object.entries(labels)) ALIASES[f as Field].add(norm(label));
}
const TOTAL_LABELS = new Set(["total", "grand total", "sub total", "subtotal", "សរុប", "សរុបរួម", ...Object.values(dicts).flatMap((d) => [norm(d.expenseTotal), norm(d.subtotal)])]);
const isTotalLabel = (s: string) => TOTAL_LABELS.has(norm(s));

const num = parseNumber;

function parseCategory(raw: string): ExpenseCategory {
  const v = norm(raw.replace(/\p{Extended_Pictographic}/gu, ""));
  if (!v) return "OTHER";
  for (const c of EXPENSE_CATEGORIES) {
    if (v === c.toLowerCase()) return c;
    for (const d of Object.values(dicts)) if (v === norm(d[`cat_${c}`])) return c;
  }
  return "OTHER";
}

function parseDue(raw: string): Date | null {
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]));
  return null;
}

export type ImportedExpense = {
  title: string;
  group: string | null;
  quantity: number;
  unitPrice: number | null;
  amount: number;
  paid: number;
  category: ExpenseCategory;
  vendor: string | null;
  dueDate: Date | null;
  notes: string | null;
};


export async function parseExpenseFile(file: File): Promise<{ ok: true; expenses: ImportedExpense[]; skipped: number } | { ok: false }> {
  const rows = (await readRows(file)).map((r) => r.map((c) => (c ?? "").trim()));
  const headerCols = (row: string[]) => {
    const cols = new Map<Field, number>();
    row.forEach((cell, i) => {
      const h = norm(cell);
      for (const f of FIELDS) if (!cols.has(f) && ALIASES[f].has(h)) cols.set(f, i);
    });
    // a header needs a description column and at least one money/quantity column
    return cols.has("title") && (cols.has("total") || cols.has("price") || cols.has("quantity")) ? cols : null;
  };

  const headerIndex = rows.findIndex((r) => headerCols(r));
  if (headerIndex < 0) return { ok: false };
  let cols = headerCols(rows[headerIndex])!;
  const get = (row: string[], f: Field) => {
    const i = cols.get(f);
    return i === undefined ? "" : (row[i] ?? "");
  };
  const firstText = (row: string[]) => row.find((c) => c && num(c) === null && !isTotalLabel(c)) ?? null;

  // The group of the first table is the title row just above the header ("Group 1")
  const above = rows.slice(0, headerIndex).reverse().find((r) => r.some(Boolean));
  let group: string | null = above && !cols.has("group") ? firstText(above) : null;

  const expenses: ImportedExpense[] = [];
  let skipped = 0;
  for (const row of rows.slice(headerIndex + 1)) {
    if (!row.some(Boolean)) continue;
    const again = headerCols(row);
    if (again) {
      cols = again; // a repeated header (each table of an exported sheet has one)
      continue;
    }
    const title = get(row, "title");
    if (title && isTotalLabel(title)) continue;
    const no = num(get(row, "no"));
    const qty = num(get(row, "quantity"));
    const price = num(get(row, "price"));
    const total = num(get(row, "total"));
    const hasNumbers = no !== null || qty !== null || price !== null || total !== null;

    if (!title) {
      // "Group 2" written in another column, or an empty numbered row (skip)
      if (!hasNumbers && !row.some((c) => isTotalLabel(c))) group = firstText(row) ?? group;
      else if (!row.some((c) => isTotalLabel(c)) && row.some(Boolean) && no === null) skipped++;
      continue;
    }
    if (!hasNumbers && !cols.has("group")) {
      group = title; // a group title row in the description column
      continue;
    }

    const quantity = qty ?? 1;
    const amount = round2(Math.max(0, total ?? (price !== null ? quantity * price : 0)));
    expenses.push({
      title: title.slice(0, 120),
      group: (cols.has("group") ? get(row, "group") : group)?.slice(0, 60) || null,
      quantity: Math.max(0, round2(quantity)),
      unitPrice: price === null ? null : Math.max(0, round2(price)),
      amount,
      paid: Math.min(amount, Math.max(0, round2(num(get(row, "paid")) ?? 0))),
      category: parseCategory(get(row, "category")),
      vendor: get(row, "vendor").slice(0, 120) || null,
      dueDate: parseDue(get(row, "due")),
      notes: get(row, "notes").slice(0, 1000) || null,
    });
  }
  return { ok: true, expenses, skipped };
}

/* ───────────────────────── export ───────────────────────── */

export type ExportExpense = ImportedExpense;

const groupsOf = (expenses: ExportExpense[], t: Dict) => {
  const map = new Map<string, ExportExpense[]>();
  const anyGroup = expenses.some((e) => e.group);
  for (const e of expenses) {
    const key = e.group ?? (anyGroup ? t.noGroup : "");
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()];
};

const dateStr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function buildExpenseXlsx(expenses: ExportExpense[], t: Dict, opts: { title: string; currency: string; budget: number | null }) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(t.tabExpenses, { views: [{ showGridLines: false }] });
  const money = opts.currency === "KHR" ? '#,##0" ៛";-#,##0" ៛";"-"' : '"$"#,##0.00;-"$"#,##0.00;"$ -"';
  sheet.columns = [6, 34, 9, 13, 14, 13, 18, 18, 12, 34].map((width) => ({ width }));
  const gold = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3DEA3" } } as const;
  const ivory = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF8EC" } } as const;
  const thin = { style: "thin", color: { argb: "FFD9C7A0" } } as const;
  const box = { top: thin, left: thin, bottom: thin, right: thin };

  const titleRow = sheet.addRow(["", opts.title]);
  titleRow.font = { bold: true, italic: true, size: 14 };
  sheet.mergeCells(titleRow.number, 2, titleRow.number, 10);
  const grand = sheet.addRow(["", "", "", t.expenseTotal]);
  grand.font = { bold: true };
  if (opts.budget !== null) {
    const b = sheet.addRow(["", "", "", t.budget, opts.budget]);
    b.font = { bold: true };
    b.getCell(5).numFmt = money;
  }

  const header = ["No", t.expenseTitle, t.expenseQuantity, t.expenseUnitPrice, t.expenseAmount, t.expensePaid, t.expenseCategory, t.expenseVendor, t.expenseDue, t.notes];
  const totalCells: string[] = [];
  const paidCells: string[] = [];
  const list = groupsOf(expenses, t);
  if (!list.length) list.push(["Group 1", []]); // template: one empty table

  for (const [name, items] of list) {
    sheet.addRow([]);
    if (name) {
      const g = sheet.addRow(["", name]);
      g.font = { bold: true, size: 12 };
    }
    const h = sheet.addRow(header);
    h.eachCell((c) => {
      c.font = { bold: true };
      c.fill = gold;
      c.border = box;
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    const first = sheet.rowCount + 1;
    items.forEach((e, i) => {
      const r = sheet.addRow([i + 1, e.title, e.quantity, e.unitPrice, e.amount, e.paid, t[`cat_${e.category}`], e.vendor ?? "", dateStr(e.dueDate), e.notes ?? ""]);
      [4, 5, 6].forEach((c) => (r.getCell(c).numFmt = money));
      r.eachCell({ includeEmpty: true }, (c) => (c.border = box));
    });
    const last = sheet.rowCount;
    const total = sheet.addRow(["", t.subtotal.toUpperCase()]);
    total.font = { bold: true };
    if (items.length) {
      total.getCell(5).value = { formula: `SUM(E${first}:E${last})` };
      total.getCell(6).value = { formula: `SUM(F${first}:F${last})` };
    }
    for (let c = 1; c <= 10; c++) {
      total.getCell(c).fill = ivory;
      total.getCell(c).border = box;
    }
    [5, 6].forEach((c) => (total.getCell(c).numFmt = money));
    totalCells.push(`E${total.number}`);
    paidCells.push(`F${total.number}`);
  }
  grand.getCell(5).value = { formula: totalCells.join("+") || "0" };
  grand.getCell(6).value = { formula: paidCells.join("+") || "0" };
  [5, 6].forEach((c) => (grand.getCell(c).numFmt = money));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildExpenseCsv(expenses: ExportExpense[], t: Dict) {
  const header = ["No", t.expenseGroup, t.expenseTitle, t.expenseQuantity, t.expenseUnitPrice, t.expenseAmount, t.expensePaid, t.expenseCategory, t.expenseVendor, t.expenseDue, t.notes];
  const body = expenses.map((e, i) => [i + 1, e.group ?? "", e.title, e.quantity, e.unitPrice ?? "", e.amount, e.paid, t[`cat_${e.category}`], e.vendor ?? "", dateStr(e.dueDate), e.notes ?? ""]);
  return "﻿" + Papa.unparse([header, ...body]); // BOM so Excel reads the Khmer text
}
