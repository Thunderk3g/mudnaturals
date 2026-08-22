import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photography is served from /public/media, so no remote hosts are
    // whitelisted. Adding one later is a deliberate act, not an accident.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 828, 1080, 1200, 1920],
  },

  // `postgres` opens raw TCP sockets; it must never be bundled for the browser.
  serverExternalPackages: ["postgres"],

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
