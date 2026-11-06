import localFont from "next/font/local";

// Invitation fonts, all bundled in src/fonts (SIL OFL) so `next build` never downloads from Google:
// fetching at build time failed intermittently ("Cannot read properties of null (reading '1')" in
// next/font/google) and would also break offline / Docker builds.
//   - single-script fonts: the same woff2 subset files next/font/google used before;
//   - Khmer + Latin fonts (Moul, Battambang, Moulpali): one complete .woff per weight covering both.

// Royal gold: Moul for Khmer titles (the classic wedding-card face), Noto Serif Khmer for Khmer text,
// Cormorant Garamond for English.
export const moul = localFont({ src: "../fonts/Moul-400.woff", weight: "400", display: "swap", variable: "--font-moul" });
export const notoSerifKhmer = localFont({
  src: "../fonts/NotoSerifKhmer-khmer.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-km-serif",
});
export const cormorant = localFont({
  src: [
    { path: "../fonts/CormorantGaramond-latin-normal-500-600.woff2", weight: "500 600", style: "normal" },
    { path: "../fonts/CormorantGaramond-latin-italic-500-600.woff2", weight: "500 600", style: "italic" },
  ],
  display: "swap",
  variable: "--font-cormorant",
});

// Bold display serif for guest-name plates
export const playfair = localFont({
  src: "../fonts/PlayfairDisplay-latin-normal-700-800.woff2",
  weight: "700 800",
  display: "swap",
  variable: "--font-playfair",
});

// Script face for short Latin flourishes ("Congratulations!")
export const greatVibes = localFont({ src: "../fonts/GreatVibes-latin-normal-400.woff2", weight: "400", display: "swap", variable: "--font-script" });

export const royalFontVars = `${moul.variable} ${notoSerifKhmer.variable} ${cormorant.variable} ${playfair.variable} ${greatVibes.variable}`;

// Lotus arch: Battambang for Khmer body text, Moulpali for Khmer names
export const battambang = localFont({
  src: [
    { path: "../fonts/Battambang-300.woff", weight: "300", style: "normal" },
    { path: "../fonts/Battambang-400.woff", weight: "400", style: "normal" },
    { path: "../fonts/Battambang-700.woff", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-battambang",
});
export const moulpali = localFont({ src: "../fonts/Moulpali-400.woff", weight: "400", display: "swap", variable: "--font-moulpali" });

export const lotusFontVars = `${royalFontVars} ${battambang.variable} ${moulpali.variable}`;
