import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30601-30700 (Taegliche Gewinner-Liste chronologisch).
const BUILD_MARKER = 'welle-30601-30700-taegliche-gewinner';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
