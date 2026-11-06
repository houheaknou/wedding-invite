import { describe, expect, it } from "vitest";
import { khmerDigitsToAscii, money, opt, parseNumber, str } from "@/lib/parse";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

// Review L-2: one parser for forms and imports
describe("parseNumber", () => {
  it.each([
    ["1,250.50", 1250.5],
    ["$ 1,250.00", 1250],
    ["1 250", 1250],
    ["៥០", 50],
    ["១០០,០០០៛", 100_000],
    ["50 USD", 50],
    ["20000 riel", 20_000],
    ["-5", -5],
  ])("%s → %d", (raw, n) => expect(parseNumber(raw)).toBe(n));

  it.each(["", "  ", "-", "--", "abc", "12abc"])("%j → null", (raw) => expect(parseNumber(raw)).toBeNull());

  it("converts Khmer digits", () => expect(khmerDigitsToAscii("០១២៣៤៥៦៧៨៩")).toBe("0123456789"));
});

describe("form helpers", () => {
  const fd = form({ name: "  Sok Dara  ", empty: "   ", price: "$1,250.555", zero: "0", neg: "-3", huge: "1e12" });

  it("str / opt trim, cut and blank → null", () => {
    expect(str(fd, "name")).toBe("Sok Dara");
    expect(str(fd, "name", 3)).toBe("Sok");
    expect(str(fd, "missing")).toBe("");
    expect(opt(fd, "empty")).toBeNull();
    expect(opt(fd, "name", 200)).toBe("Sok Dara");
  });

  it("money rounds to cents and rejects negative, huge and (optionally) zero", () => {
    expect(money(fd, "price")).toBe(1250.56);
    expect(money(fd, "zero")).toBe(0);
    expect(money(fd, "zero", { allowZero: false })).toBeNull();
    expect(money(fd, "neg")).toBeNull();
    expect(money(fd, "huge")).toBeNull();
    expect(money(fd, "empty")).toBeNull();
  });
});
