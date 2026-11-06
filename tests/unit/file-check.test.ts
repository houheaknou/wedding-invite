import { describe, expect, it } from "vitest";
import { readAudio, readImage, sniffAudio, sniffImage } from "@/lib/file-check";

// Review M-3: the stored type comes from the bytes, never from the browser-declared MIME type.
const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const pad = (b: Uint8Array, n = 32) => {
  const out = new Uint8Array(Math.max(n, b.length));
  out.set(b);
  return out;
};

const JPEG = pad(bytes([0xff, 0xd8, 0xff, 0xe0]));
const PNG = pad(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const WEBP = pad(bytes("RIFF", [0, 0, 0, 0], "WEBP"));
const HTML = pad(bytes("<html><script>alert(1)</script>"));

describe("sniffImage", () => {
  it("detects JPEG, PNG and WebP by their magic bytes", () => {
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(WEBP)).toBe("image/webp");
  });

  it("rejects HTML, SVG, GIF and truncated files", () => {
    expect(sniffImage(HTML)).toBeNull();
    expect(sniffImage(pad(bytes('<svg xmlns="http://www.w3.org/2000/svg">')))).toBeNull();
    expect(sniffImage(pad(bytes("GIF89a")))).toBeNull();
    expect(sniffImage(bytes([0xff, 0xd8]))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("sniffAudio", () => {
  it.each([
    [bytes("ID3", [3, 0]), "mp3"],
    [bytes([0, 0, 0, 0x20], "ftypM4A "), "m4a"],
    [bytes("OggS"), "ogg"],
    [bytes("RIFF", [0, 0, 0, 0], "WAVE"), "wav"],
    [bytes([0xff, 0xf1]), "aac"],
    [bytes([0xff, 0xfb]), "mp3"],
  ])("detects %#", (head, ext) => {
    expect(sniffAudio(pad(head))?.ext).toBe(ext);
  });

  it("rejects non-audio and too-short input", () => {
    expect(sniffAudio(HTML)).toBeNull();
    expect(sniffAudio(WEBP)).toBeNull();
    expect(sniffAudio(bytes("ID3"))).toBeNull();
  });
});

describe("readImage / readAudio", () => {
  const file = (data: Uint8Array, name: string, type: string) => new File([data as BlobPart], name, { type });

  it("uses the detected type, not the declared one", async () => {
    const res = await readImage(file(PNG, "photo.jpg", "image/jpeg"), 1024);
    expect(res?.type).toBe("image/png");
  });

  it("refuses an HTML file renamed to .jpg", async () => {
    expect(await readImage(file(HTML, "photo.jpg", "image/jpeg"), 1024)).toBeNull();
  });

  it("enforces the size limit and rejects empty files", async () => {
    expect(await readImage(file(JPEG, "a.jpg", "image/jpeg"), 10)).toBeNull();
    expect(await readImage(file(new Uint8Array(), "a.jpg", "image/jpeg"), 1024)).toBeNull();
    expect(await readAudio(file(pad(bytes("OggS")), "song.ogg", "audio/ogg"), 10)).toBeNull();
  });

  it("returns the audio format for a real song header", async () => {
    const res = await readAudio(file(pad(bytes("ID3", [3, 0])), "song.bin", "application/octet-stream"), 1024);
    expect(res).toMatchObject({ type: "audio/mpeg", ext: "mp3" });
  });
});
