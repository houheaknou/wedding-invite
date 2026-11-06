/**
 * Soft hearts and gold petals drifting behind the page (the login look, shared by every app page).
 * Fixed to the window, so they stay put while the content scrolls; behind everything, never clickable,
 * and still for people who ask for reduced motion (see .auth-float in globals.css).
 * The warm glow in two corners comes along with it.
 */

/** [left %, top %, size px, delay s, kind] */
const FLOATERS: [number, number, number, number, "heart" | "petal"][] = [
  [8, 14, 22, 0, "heart"],
  [86, 10, 16, 1.2, "petal"],
  [92, 46, 24, 2.4, "heart"],
  [5, 58, 18, 0.8, "petal"],
  [14, 86, 14, 3, "heart"],
  [80, 82, 20, 1.8, "petal"],
  [50, 4, 12, 2.8, "petal"],
];

function Floater({ kind, size }: { kind: "heart" | "petal"; size: number }) {
  return kind === "heart" ? (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.8-1.4 2.3-2.6 4.4-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="currentColor" d="M12 2c4 4.5 6 8.3 6 11.2A6 6 0 0 1 6 13.2C6 10.3 8 6.5 12 2z" />
    </svg>
  );
}

export function FloatingDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(60rem_30rem_at_10%_-10%,var(--color-brand-100),transparent),radial-gradient(50rem_30rem_at_110%_110%,#fde4e4,transparent)]"
    >
      {FLOATERS.map(([left, top, size, delay, kind], i) => (
        <span
          key={i}
          className={`auth-float absolute ${kind === "heart" ? "text-rose-300/70" : "text-brand-300/70"}`}
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }}
        >
          <Floater kind={kind} size={size} />
        </span>
      ))}
    </div>
  );
}
