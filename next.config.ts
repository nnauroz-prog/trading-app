import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-07 — Welle 18901-19000.
const BUILD_MARKER = 'welle-18901-19000-backtest-live-konsistenz';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
