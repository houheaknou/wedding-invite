import { describe, expect, it } from "vitest";
import { formatMoney, payStatus } from "@/features/expenses/shared";
import { giftTotals } from "@/features/gifts/shared";

describe("formatMoney", () => {
  it("shows dollars without cents when whole, with two decimals otherwise", () => {
    expect(formatMoney(1250, "USD")).toBe("$1,250");
    expect(formatMoney(1250.5, "USD")).toBe("$1,250.50");
    expect(formatMoney(0, "USD")).toBe("$0");
  });

  it("rounds riel to whole numbers (no cents)", () => {
    expect(formatMoney(5_000_000, "KHR")).toBe("5,000,000 ៛");
    expect(formatMoney(1999.6, "KHR")).toBe("2,000 ៛");
  });
});

describe("payStatus", () => {
  it.each([
    [100, 0, "UNPAID"],
    [100, -5, "UNPAID"],
    [100, 40, "PARTIAL"],
    [100, 100, "PAID"],
    [100, 120, "PAID"],
    [0, 0, "UNPAID"],
  ] as const)("amount %d, paid %d → %s", (amount, paid, status) => {
    expect(payStatus(amount, paid)).toBe(status);
  });
});

describe("giftTotals", () => {
  it("keeps dollars and riel apart, never adding them together", () => {
    const totals = giftTotals([
      { amount: 50, currency: "USD" },
      { amount: 100_000, currency: "KHR" },
      { amount: 20.5, currency: "USD" },
      { amount: 40_000, currency: "KHR" },
    ]);
    expect(totals).toEqual({ usd: 70.5, khr: 140_000 });
  });

  it("is zero for an empty gift book", () => {
    expect(giftTotals([])).toEqual({ usd: 0, khr: 0 });
  });
});
