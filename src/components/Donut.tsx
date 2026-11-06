/** Server-rendered SVG donut; segments with value 0 are skipped. */
export function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: string | number;
  centerLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 15.915; // circumference = 100, so dash lengths are percentages
  let offset = 25; // start at 12 o'clock
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-44">
        <svg viewBox="0 0 42 42" className="size-full">
          <circle cx="21" cy="21" r={r} fill="none" stroke="#f5f5f4" strokeWidth="5" />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const pct = (s.value / total) * 100;
                const el = (
                  <circle
                    key={s.label}
                    cx="21"
                    cy="21"
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="5"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeDashoffset={offset}
                  >
                    <title>{`${s.label}: ${s.value}`}</title>
                  </circle>
                );
                offset -= pct;
                return el;
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-stone-800">{centerValue}</span>
          <span className="text-xs text-stone-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-stone-600">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
            {total > 0 && <span className="text-stone-400">{Math.round((s.value / total) * 100)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
