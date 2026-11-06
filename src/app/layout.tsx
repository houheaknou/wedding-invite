import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import { getDict } from "@/lib/i18n";
import "./globals.css";

const notoSansKhmer = Noto_Sans_Khmer({
  variable: "--font-noto-sans-khmer",
  subsets: ["khmer"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
