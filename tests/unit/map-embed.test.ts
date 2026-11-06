import { describe, expect, it } from "vitest";
import { embedFromLink, openLinkFrom } from "@/lib/map-embed";

const place =
  "https://www.google.com/maps/place/Sokha+Phnom+Penh+Hotel/@11.5732,104.9301,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d11.5735!4d104.9312?entry=ttu&g_ep=abc";

describe("embedFromLink", () => {
  it("prefers the exact place pin coordinates", () => {
    expect(embedFromLink(place)).toBe("https://maps.google.com/maps?q=11.5735,104.9312&z=16&output=embed");
  });

  it("falls back to the place name, then the viewport centre", () => {
    expect(embedFromLink("https://www.google.com/maps/place/Sokha+Hotel/@11.5,104.9,17z")).toBe(
      "https://maps.google.com/maps?q=Sokha%20Hotel&z=16&output=embed",
    );
    expect(embedFromLink("https://www.google.com/maps/@11.5,104.9,17z")).toBe(
      "https://maps.google.com/maps?q=11.5,104.9&z=16&output=embed",
    );
  });

  it("uses a q= search", () => {
    expect(embedFromLink("https://maps.google.com/?q=Royal+Palace")).toBe(
      "https://maps.google.com/maps?q=Royal%20Palace&z=16&output=embed",
    );
  });

  it("returns null when the link carries no location", () => {
    expect(embedFromLink("https://www.google.com/maps")).toBeNull();
  });
});

describe("openLinkFrom", () => {
  it("drops the sharer's tracking query string", () => {
    expect(openLinkFrom(place)).toBe(
      "https://www.google.com/maps/place/Sokha+Phnom+Penh+Hotel/@11.5732,104.9301,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d11.5735!4d104.9312",
    );
  });

  it("ignores non-Google and non-place links", () => {
    expect(openLinkFrom("https://evil.example/maps/place/x")).toBeNull();
    expect(openLinkFrom("https://www.google.com/search?q=x")).toBeNull();
  });
});
