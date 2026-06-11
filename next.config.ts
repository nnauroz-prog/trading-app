import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30001-30100 (Simple-Picks: Endstand + Treffer + Filter).
const BUILD_MARKER = 'welle-30001-30100-simple-picks-endstand-filter';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
