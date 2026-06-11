import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29601-29700 (Sport-Signal-Modi + Odds/Value-Layer).
const BUILD_MARKER = 'welle-29601-29700-odds-value-layer';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
