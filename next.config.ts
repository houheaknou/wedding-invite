import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Docker image (see Dockerfile)
  output: "standalone",
  experimental: {
    serverActions: {
      // Guest imports, cover photos and invitation music (≤10MB) go through server actions
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["exceljs"],
  // No floating "N" dev badge: testers use the dev server through the public tunnel link.
  // Build errors still show as the full-screen overlay.
  devIndicators: false,
  // Baseline security headers on every response [review M-2]. A Content-Security-Policy is left for
  // later: the Telegram widget, Google Maps iframes and Google Fonts need an allow-list first.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // uploaded photos/music are served with their stored type; never let browsers re-guess it
          { key: "X-Content-Type-Options", value: "nosniff" },
          // share ids in invitation URLs don't leak to other sites through Referer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // no framing by other sites (click-jacking); our own pages may still frame each other
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
