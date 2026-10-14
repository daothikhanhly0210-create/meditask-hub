import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: This project runs on a FAT32 volume, which does not support the
  // junctions/symlinks Turbopack needs (see README). We therefore build and
  // run with Webpack (`next dev --webpack` / `next build --webpack`) and let
  // Tailwind run through PostCSS (see postcss.config.mjs).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
