import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: This project runs on a FAT32 volume, which does not support the
  // junctions/symlinks Turbopack needs (see README). We therefore build and
  // run with Webpack (`next dev --webpack` / `next build --webpack`) and let
  // Tailwind run through PostCSS (see postcss.config.mjs).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // B2 stores attachments (up to 20 MB) in Postgres through Server Actions,
  // so the default 1 MB body limit is raised.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
