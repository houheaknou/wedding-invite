import localFont from "next/font/local";
import { Battambang, Cormorant_Garamond, Great_Vibes, Moul, Moulpali, Playfair_Display } from "next/font/google";

// Fonts for the Royal gold invitation: Moul for Khmer titles (the classic wedding-card face),
// Noto Serif Khmer for Khmer text, Cormorant Garamond for English.
export const moul = Moul({ weight: "400", subsets: ["khmer", "latin"], variable: "--font-moul" });
// Self-hosted (SIL OFL): Google serves this family as one variable file, which next/font/google's
// loader can't handle at build time ("Cannot read properties of null (reading '1')" in `next build`).
// Khmer subset of Noto Serif Khmer v29, all weights in one file.
export const notoSerifKhmer = localFont({
  src: "../fonts/NotoSerifKhmer-khmer.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-km-serif",
});
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

// Bold display serif for guest-name plates
export const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-playfair" });

// Script face for short Latin flourishes ("Congratulations!")
export const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script" });

export const royalFontVars = `${moul.variable} ${notoSerifKhmer.variable} ${cormorant.variable} ${playfair.variable} ${greatVibes.variable}`;

// Lotus arch: Battambang for Khmer body text, Moulpali for Khmer names
export const battambang = Battambang({ subsets: ["khmer", "latin"], weight: ["300", "400", "700"], variable: "--font-battambang" });
export const moulpali = Moulpali({ subsets: ["khmer", "latin"], weight: "400", variable: "--font-moulpali" });

export const lotusFontVars = `${royalFontVars} ${battambang.variable} ${moulpali.variable}`;
