import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29401-29500 (Bankroll-Tagesdeckel).
const BUILD_MARKER = 'welle-29401-29500-tagesdeckel';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
