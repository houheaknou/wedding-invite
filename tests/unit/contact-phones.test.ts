import { describe, expect, it } from "vitest";
import { contactPhoneList } from "@/features/invitation/shared";

describe("contactPhoneList (invitation contact phones)", () => {
  it("drops blank lines and repeats, comparing by digits", () => {
    expect(contactPhoneList("016 300 247\n016 300 247\n\n088 422 7478\n088 422  7478\n016300247")).toEqual([
      { label: "016 300 247", tel: "016300247" },
      { label: "088 422 7478", tel: "0884227478" },
    ]);
  });

  it("keeps a leading + for international numbers", () => {
    expect(contactPhoneList(" +855 16 300 247 ")).toEqual([{ label: "+855 16 300 247", tel: "+85516300247" }]);
  });

  it("is empty when nothing usable was typed", () => {
    expect(contactPhoneList(null)).toEqual([]);
    expect(contactPhoneList("\n  \n")).toEqual([]);
    expect(contactPhoneList("call us")).toEqual([]);
  });
});
