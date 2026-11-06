import "server-only";

/**
 * Upload checks by content, not by the browser-declared type [review M-3]: the first bytes
 * ("magic numbers") decide what a file is, and that detected type is what gets stored and later
 * served (with `nosniff`), so a renamed HTML/script file can't be uploaded as a photo or song.
 */

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

const ascii = (b: Uint8Array, at: number, text: string) => [...text].every((c, i) => b[at + i] === c.charCodeAt(0));

export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  if (b.length >= 12 && ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return "image/webp";
  return null;
}

export type AudioFormat = { type: string; ext: "mp3" | "m4a" | "aac" | "ogg" | "wav" };

export function sniffAudio(b: Uint8Array): AudioFormat | null {
  if (b.length < 12) return null;
  if (ascii(b, 0, "ID3")) return { type: "audio/mpeg", ext: "mp3" }; // MP3 with ID3 tags
  if (ascii(b, 4, "ftyp")) return { type: "audio/mp4", ext: "m4a" }; // MP4 / M4A container
  if (ascii(b, 0, "OggS")) return { type: "audio/ogg", ext: "ogg" };
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE")) return { type: "audio/wav", ext: "wav" };
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return { type: "audio/aac", ext: "aac" }; // AAC ADTS
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return { type: "audio/mpeg", ext: "mp3" }; // bare MP3 frame
  return null;
}

/** Bytes + detected type of an uploaded image within `maxBytes`, or null if it isn't a JPEG/PNG/WebP. */
export async function readImage(file: File, maxBytes: number): Promise<{ data: Uint8Array<ArrayBuffer>; type: ImageType } | null> {
  if (file.size === 0 || file.size > maxBytes) return null;
  const data = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(data);
  return type ? { data, type } : null;
}

/** Bytes + detected format of an uploaded song within `maxBytes`, or null if it isn't a supported audio file. */
export async function readAudio(file: File, maxBytes: number): Promise<({ data: Uint8Array<ArrayBuffer> } & AudioFormat) | null> {
  if (file.size === 0 || file.size > maxBytes) return null;
  const data = new Uint8Array(await file.arrayBuffer());
  const format = sniffAudio(data);
  return format ? { data, ...format } : null;
}
