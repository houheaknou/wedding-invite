import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
