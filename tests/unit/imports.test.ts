import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseExpenseFile } from "@/lib/expense-io";
import { parseGiftFile } from "@/lib/gift-io";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, isSupportedFile, parseGuestFile } from "@/lib/guest-io";

const csv = (rows: (string | number)[][], name = "list.csv") =>
  new File(["﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], name, { type: "text/csv" });

async function xlsx(rows: (string | number | null)[][], name = "list.xlsx") {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Sheet1");
  for (const r of rows) sheet.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf as ArrayBuffer], name);
}

describe("budget sheet import (the couple's layout)", () => {
  it("reads grouped tables with TOTAL rows, qty × price and deposits", async () => {
    const file = await xlsx([
      [null, "Wedding plan"],
      [null, null, null, "TOTAL", 3150],
      [],
      [null, "Group 1"],
      ["No", "Description", "Amount", "Price", "Total", "Deposit", "Note"],
      [1, "Tables", 30, 50, 1500, 500, "with chairs"],
      [2, "Flowers", null, null, 600, null, null],
      [null, null, null, "TOTAL", 2100],
      [],
      [null, "Group 2"],
      ["No", "Description", "Amount", "Price", "Total", "Deposit", "Note"],
      [1, "Photographer", 1, 1050, null, "$ 1,050", null],
      [3, null, null, null, null],
      [null, null, null, "TOTAL", 1050],
    ]);
    const res = await parseExpenseFile(file);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.expenses.map((e) => [e.group, e.title, e.quantity, e.unitPrice, e.amount, e.paid, e.notes])).toEqual([
      ["Group 1", "Tables", 30, 50, 1500, 500, "with chairs"],
      ["Group 1", "Flowers", 1, null, 600, 0, null],
      ["Group 2", "Photographer", 1, 1050, 1050, 1050, null],
    ]);
  });

  it("reads a flat CSV with a Group column, Khmer digits and riel signs", async () => {
    const res = await parseExpenseFile(
      csv([
        ["Group", "Description", "Qty", "Price", "Deposit", "Category", "Due date"],
        ["Venue", "Hall", "១", "៥,០០០,០០០៛", "1,000,000", "venue", "20/12/2026"],
        ["Food", "Cake", "2", "35.5", "-", "", ""],
      ]),
    );
    if (!res.ok) throw new Error("not parsed");
    expect(res.expenses[0]).toMatchObject({ group: "Venue", title: "Hall", amount: 5_000_000, paid: 1_000_000, category: "VENUE" });
    expect(res.expenses[0].dueDate?.toISOString()).toBe("2026-12-20T00:00:00.000Z");
    expect(res.expenses[1]).toMatchObject({ group: "Food", quantity: 2, unitPrice: 35.5, amount: 71, paid: 0, category: "OTHER", dueDate: null });
  });

  it("never records more paid than the total, nor negative amounts", async () => {
    const res = await parseExpenseFile(csv([["Description", "Total", "Paid"], ["Band", "-200", "50"], ["Dress", "300", "900"]]));
    if (!res.ok) throw new Error("not parsed");
    expect(res.expenses.map((e) => [e.amount, e.paid])).toEqual([[0, 0], [300, 300]]);
  });

  it("refuses a file without a recognisable header", async () => {
    expect(await parseExpenseFile(csv([["foo", "bar"], ["1", "2"]]))).toEqual({ ok: false });
  });
});

describe("gift book import", () => {
  it("splits a row with both $ and ៛ into two gifts and skips the total", async () => {
    const res = await parseGiftFile(
      csv([
        ["ឈ្មោះ", "ដុល្លារ", "រៀល", "ខាង", "Method"],
        ["Sok Dara", "50", "100,000", "ខាងកូនក្រមុំ", "ABA"],
        ["Chan Thy", "", "៤០០០០", "groom", ""],
        ["សរុប", "50", "140000", "", ""],
      ]),
    );
    if (!res.ok) throw new Error("not parsed");
    expect(res.gifts).toEqual([
      { name: "Sok Dara", amount: 50, currency: "USD", side: "BRIDE", method: "BANK", notes: null },
      { name: "Sok Dara", amount: 100_000, currency: "KHR", side: "BRIDE", method: "BANK", notes: null },
      { name: "Chan Thy", amount: 40_000, currency: "KHR", side: "GROOM", method: "CASH", notes: null },
    ]);
  });

  it("guesses the currency of a single Amount column", async () => {
    const res = await parseGiftFile(
      csv([
        ["Name", "Amount", "Currency"],
        ["A", "30", ""],
        ["B", "50000", ""],
        ["C", "20", "KHR"],
        ["D", "$1,500", ""],
        ["E", "0", ""],
      ]),
    );
    if (!res.ok) throw new Error("not parsed");
    expect(res.gifts.map((g) => [g.name, g.amount, g.currency])).toEqual([
      ["A", 30, "USD"],
      ["B", 50_000, "KHR"],
      ["C", 20, "KHR"],
      ["D", 1500, "USD"],
    ]);
  });
});

describe("guest list import", () => {
  it("maps sides, counts and statuses, and counts rows without a name as skipped", async () => {
    const res = await parseGuestFile(
      csv([
        ["Name", "Phone", "Side", "Count", "Status"],
        ["Sok Dara", "012 345 678", "bride", "៣", "confirmed"],
        ["Chan Thy", "", "", "abc", ""],
        ["", "099", "", "", ""],
      ]),
    );
    if (!res.ok) throw new Error("not parsed");
    expect(res.skipped).toBe(1);
    expect(res.guests.map((g) => [g.name, g.phone, g.side, g.invitedCount, g.status])).toEqual([
      ["Sok Dara", "012 345 678", "BRIDE", 3, "CONFIRMED"],
      ["Chan Thy", null, "BOTH", 1, "PENDING"],
    ]);
  });
});

describe("import limits [review M-5]", () => {
  it("accepts only .xlsx/.csv within the size limit", () => {
    expect(isSupportedFile(new File(["x"], "guests.csv"))).toBe(true);
    expect(isSupportedFile(new File(["x"], "guests.XLSX"))).toBe(true);
    expect(isSupportedFile(new File(["x"], "guests.xls"))).toBe(false);
    expect(isSupportedFile(new File([new Uint8Array(IMPORT_MAX_BYTES + 1)], "big.csv"))).toBe(false);
  });

  it("refuses a CSV with more rows than the limit", async () => {
    const rows = [["Name"], ...Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => [`Guest ${i}`])];
    await expect(parseGuestFile(csv(rows))).rejects.toThrow("too many rows");
  });
});
