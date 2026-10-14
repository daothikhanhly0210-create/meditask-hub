#!/usr/bin/env node
/**
 * FAT32 compatibility patch for Next.js.
 *
 * This project lives on a FAT32 removable volume, which does not implement
 * POSIX symlinks: `fs.readlink()` on a regular file fails with `EISDIR`
 * ("illegal operation on a directory") instead of the usual `EINVAL`
 * ("invalid argument"). Several places in Next.js call `readlink()` purely to
 * detect symlinks and only tolerate `EINVAL`/`ENOENT`/`UNKNOWN`, so production
 * builds crash with `EISDIR: illegal operation on a directory, readlink ...`.
 *
 * This script widens those checks to also accept `EISDIR`, which is the
 * behaviour FAT32 volumes need. It runs automatically via `postinstall` and is
 * idempotent, so re-running it (or reinstalling `next`) is safe.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

// The EISDIR-vs-EINVAL quirk only affects Windows running on FAT32 volumes.
// Skip entirely on other platforms (e.g. the Linux build machines at Vercel).
if (process.platform !== "win32") {
  console.log("[patch-next-fat32] skipped (non-Windows platform)");
  process.exit(0);
}

const files = [
  "next/dist/build/webpack/plugins/next-trace-entrypoints-plugin.js",
  "next/dist/build/collect-build-traces.js",
  "next/dist/build/adapter/build-complete.js",
  "next/dist/esm/build/webpack/plugins/next-trace-entrypoints-plugin.js",
  "next/dist/esm/build/collect-build-traces.js",
  "next/dist/esm/build/adapter/build-complete.js",
];

const replacements = [
  {
    // nodeFileTrace readlink helper
    from: "(e.code === 'EINVAL' || e.code === 'ENOENT' || e.code === 'UNKNOWN')",
    to: "(e.code === 'EINVAL' || e.code === 'ENOENT' || e.code === 'UNKNOWN' || e.code === 'EISDIR')",
  },
  {
    // build-complete hashFile: "Not a symlink" branch
    from: "if (e.code === 'EINVAL') {\n            // Not a symlink",
    to: "if (e.code === 'EINVAL' || e.code === 'EISDIR') {\n            // Not a symlink",
  },
];

let patched = 0;
let skipped = 0;
let missing = 0;

for (const rel of files) {
  const file = path.join(root, "node_modules", rel);
  if (!fs.existsSync(file)) {
    missing += 1;
    continue;
  }

  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  for (const { from, to } of replacements) {
    updated = updated.split(from).join(to);
  }

  if (updated === original) {
    skipped += 1;
    continue;
  }

  fs.writeFileSync(file, updated);
  patched += 1;
}

console.log(
  `[patch-next-fat32] patched=${patched} already-patched=${skipped} missing=${missing}`,
);
