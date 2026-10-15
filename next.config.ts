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
};

export default nextConfig;
