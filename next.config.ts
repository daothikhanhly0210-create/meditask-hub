import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: This project runs on a FAT32 volume, which does not support the
  // junctions/symlinks Turbopack needs (see README). We therefore build and
  // run with Webpack (`next dev --webpack` / `next build --webpack`) and let
  // Tailwind run through PostCSS (see postcss.config.mjs).
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pdfkit"],
  // B2 stores attachments (up to 20 MB) in Postgres through Server Actions,
  // so the default 1 MB body limit is raised.
  experimental: {
    agentUpgrade: "security",
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // B4 exports minutes as Word/PDF. The PDF is rendered with pdfkit, which
  // needs the Unicode font bundled with the app (Vietnamese diacritics are not
  // covered by the built-in PDF fonts) plus its own standard-font metrics.
  outputFileTracingIncludes: {
    "/*": ["src/lib/export/fonts/**/*", "node_modules/pdfkit/js/data/**/*"],
  },
  // Security headers for every response. The app is only ever served over
  // HTTPS on Vercel, so HSTS is safe; framing and MIME sniffing are disabled
  // and browser features the app does not use are turned off. `microphone` is
  // left available because B4b will record meetings in the browser.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
