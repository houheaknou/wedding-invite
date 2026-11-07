/**
 * Telegram's paper plane, solid. The plane's weight sits up and to the right of its box, so it is
 * nudged left/down to look centred inside round buttons (measured against a crosshair).
 */
export function TelegramIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path
        transform="translate(-0.7 0.3)"
        d="M21.5 3.5 2.8 10.8c-1 .4-1 1.6 0 1.9l4.7 1.5 1.8 5.6c.3.8 1.2 1 1.8.4l2.6-2.4 4.7 3.5c.7.5 1.6.1 1.8-.7l3-15.6c.2-1-.8-1.8-1.7-1.5zM9.6 14.3l-.4 3.6-1.3-4.1 9.7-6.4z"
      />
    </svg>
  );
}
