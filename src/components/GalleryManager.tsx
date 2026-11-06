"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { GalleryResult } from "@/actions/gallery";
import { GALLERY_MAX } from "@/lib/constants";
import type { Dict } from "@/lib/i18n";

export type GalleryItem = { id: string; url: string };

/** Shrink a photo in the browser (max 1600px, JPEG) so uploads stay small and quick. */
async function downscale(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file; // unsupported format: let the server validate the original
  }
}

/**
 * Gallery editor inside the builder. Photos are uploaded and deleted immediately (one request each),
 * so the builder's own Save stays small. Inputs are unnamed so nothing leaks into the builder form.
 */
export function GalleryManager({
  initial,
  add,
  remove,
  onChange,
  t,
}: {
  initial: GalleryItem[];
  add: (fd: FormData) => Promise<GalleryResult>;
  remove: (photoId: string) => Promise<void>;
  onChange: (urls: string[]) => void;
  t: Dict;
}) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function update(next: GalleryItem[]) {
    setItems(next);
    onChange(next.map((i) => i.url));
  }

  async function upload(files: FileList) {
    setError(null);
    let current = items;
    const room = GALLERY_MAX - current.length;
    if (room <= 0) return setError(t.galleryFull);
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setError(t.galleryFull);
    setBusy(picked.length);
    for (const file of picked) {
      const fd = new FormData();
      fd.append("photo", await downscale(file));
      const res = await add(fd);
      if (res.ok) {
        current = [...current, res.photo];
        update(current);
      } else {
        setError(res.error);
      }
      setBusy((b) => b - 1);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-700">
          {t.galleryTitle} <span className="text-stone-400">({items.length}/{GALLERY_MAX})</span>
        </p>
        <button
          type="button"
          disabled={busy > 0 || items.length >= GALLERY_MAX}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50"
        >
          {busy > 0 ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {busy > 0 ? t.uploading : t.addPhotos}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-[3/4] overflow-hidden rounded-md bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated route */}
              <img src={item.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label={t.delete}
                onClick={async () => {
                  update(items.filter((i) => i.id !== item.id));
                  await remove(item.id);
                }}
                className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-90 transition hover:bg-red-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <div key={`busy-${i}`} className="flex aspect-[3/4] items-center justify-center rounded-md bg-amber-50">
              <Loader2 className="size-5 animate-spin text-amber-500" />
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-stone-500">{t.galleryHint}</p>
    </div>
  );
}
