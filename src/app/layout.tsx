import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { appOrigin } from "@/lib/app-origin";
import { getDict } from "@/lib/i18n";
import "./globals.css";

// App UI fonts, bundled in src/fonts (SIL OFL) so `next build` needs no network access.
const notoSansKhmer = localFont({
  src: "../fonts/NotoSansKhmer-khmer-normal-100-900.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-noto-sans-khmer",
});

const inter = localFont({
  src: "../fonts/Inter-latin-normal-100-900.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

// The app has no dark theme: "only light" stops phone browsers' auto dark mode (Chrome's
// "darken websites", Samsung Internet) from repainting the invitations dark.
// viewportFit "cover": in-app browsers whose address bar floats over the page (Telegram on iPhone)
// then report its height as env(safe-area-inset-top), which the sticky bars use to stay clear of it.
// Everywhere else the inset is 0, so nothing moves.
export const viewport: Viewport = { colorScheme: "only light", viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  // Absolute base for share previews (og:image): Telegram/Facebook fetch the invitation's cover
  // from the public address the visitor came through, never from localhost
  return { metadataBase: new URL(await appOrigin()), title: t.appName, description: t.tagline };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang } = await getDict();
  return (
    // suppressHydrationWarning: browser extensions (e.g. Grammarly's data-gr-* attributes) edit
    // <html>/<body> before React loads. It only covers these two elements' own attributes.
    <html lang={lang} className={`${notoSansKhmer.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
