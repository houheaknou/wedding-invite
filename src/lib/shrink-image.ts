/**
 * Shrink a photo in the browser before upload (max 1600px on the long side), so uploads stay
 * small and quick on phones and a form with several photos stays under the host's request limit
 * (4.5 MB on Vercel). Photos with transparency (e.g. a couple cut out of the background) keep it:
 * they go to WebP (or PNG where the browser can't encode WebP); everything else becomes JPEG.
 * Returns the original file when it can't be decoded or when shrinking wouldn't make it smaller.
 */
export async function shrinkImage(file: File, maxSide = 1600): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

    const alpha = file.type !== "image/jpeg" && hasTransparency(ctx, canvas.width, canvas.height);
    const wanted = alpha ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, wanted, 0.85));
    if (!blob || (blob.size >= file.size && scale === 1)) return file;
    const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], file.name.replace(/\.\w+$/, "") + `.${ext}`, { type: blob.type });
  } catch {
    return file; // unsupported format: let the server validate the original
  }
}

/** Any pixel not fully opaque (sampled on a grid, enough for cut-out photos). */
function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const step = Math.max(1, Math.floor((w * h) / 40_000)) * 4;
  for (let i = 3; i < data.length; i += step) if (data[i] < 255) return true;
  return false;
}
