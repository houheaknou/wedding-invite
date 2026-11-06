import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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
export const viewport: Viewport = { colorScheme: "only light" };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.appName, description: t.tagline };
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
