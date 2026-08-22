import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Escape hatch for local builds: on Windows, antivirus and folder sync hold
  // handles inside .next and the export step fails renaming files. Point the
  // build somewhere unsynced with NEXT_DIST_DIR. Unset everywhere else.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),

  images: {
    // Product photography is served from /public/media, so no remote hosts are
    // whitelisted. Adding one later is a deliberate act, not an accident.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 828, 1080, 1200, 1920],
  },

  // `postgres` opens raw TCP sockets; it must never be bundled for the browser.
  serverExternalPackages: ["postgres"],

  poweredByHeader: false,

  // Prerendering reads from Supabase in Seoul. A build running from anywhere
  // far away spends most of its time in round trips, and the 60s default is not
  // enough for the impact page's aggregations.
  staticPageGenerationTimeout: 180,

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
