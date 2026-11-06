"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

/** Floating play/pause for invitation music; on public pages it starts on the visitor's first tap. */
export function MusicButton({ src, labels, autoPlayOnTap }: { src: string; labels: [string, string]; autoPlayOnTap: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  // Browsers block autoplay; on the public page start on the visitor's first tap
  useEffect(() => {
    if (!autoPlayOnTap) return;
    const start = () => {
      if (!userPaused.current) ref.current?.play().catch(() => {});
    };
    window.addEventListener("pointerdown", start, { once: true });
    return () => window.removeEventListener("pointerdown", start);
  }, [autoPlayOnTap]);

  return (
    <div className="pointer-events-none sticky bottom-4 z-10 flex h-0 items-start justify-end pr-4">
      <audio ref={ref} src={src} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button
        type="button"
        aria-label={playing ? labels[1] : labels[0]}
        title={playing ? labels[1] : labels[0]}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          const a = ref.current;
          if (!a) return;
          if (a.paused) {
            userPaused.current = false;
            a.play().catch(() => {});
          } else {
            userPaused.current = true;
            a.pause();
          }
        }}
        className={`pointer-events-auto -translate-y-full rounded-full bg-white/90 p-3 text-brand-600 shadow-lg ring-1 ring-black/5 backdrop-blur ${playing ? "animate-[spin_4s_linear_infinite]" : ""}`}
      >
        {playing ? <Pause className="size-5" /> : <Music className="size-5" />}
      </button>
    </div>
  );
}
