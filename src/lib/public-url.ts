/**
 * Absolute URL for links that leave the app (Telegram, copy link). Uses NEXT_PUBLIC_APP_URL when set
 * (the public domain, or e.g. http://192.168.0.53:3000 to test on phones on the same Wi-Fi);
 * otherwise the address the app is opened on.
 */
export function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}
