// Browser-only: used by the invitation builder when a KHQR image is picked.
import jsQR from "jsqr";

const DETECT_MAX = 1400; // detection works on a scaled copy; the crop uses the full-size image
const OUT_MAX = 900;

/**
 * Bank apps export KHQR with a header, logo, name and amount around the code. This finds the QR
 * and returns just that square (with the white quiet zone scanners need), cut from the original
 * pixels — the code is not redrawn, so it scans exactly like the bank's image.
 * Returns null when no QR can be found (the caller keeps the original image).
 */
export async function cropToQr(file: File): Promise<File | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const scale = Math.min(1, DETECT_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const probe = document.createElement("canvas");
  probe.width = w;
  probe.height = h;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return null;
  pctx.fillStyle = "#fff"; // transparent PNGs: read as white paper
  pctx.fillRect(0, 0, w, h);
  pctx.drawImage(bitmap, 0, 0, w, h);
  const code = jsQR(pctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
  if (!code) return null;

  // bounding box of the four detected corners, back in full-size pixels
  const { topLeftCorner: a, topRightCorner: b, bottomLeftCorner: c, bottomRightCorner: d } = code.location;
  const xs = [a.x, b.x, c.x, d.x].map((v) => v / scale);
  const ys = [a.y, b.y, c.y, d.y].map((v) => v / scale);
  const side = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = side * 0.08; // quiet zone around the code
  const size = side + pad * 2;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  const outSize = Math.round(Math.min(OUT_MAX, Math.max(size, 300)));
  const out = document.createElement("canvas");
  out.width = outSize;
  out.height = outSize;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, outSize, outSize);
  octx.imageSmoothingEnabled = false; // keep module edges crisp
  octx.drawImage(bitmap, cx - size / 2, cy - size / 2, size, size, 0, 0, outSize, outSize);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new File([blob], file.name.replace(/\.\w+$/, "") + "-qr.png", { type: "image/png" });
}
