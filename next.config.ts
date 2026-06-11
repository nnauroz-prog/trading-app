import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29801-29900 (Odds-Value-Karte kompakt in Pick-Liste).
const BUILD_MARKER = 'welle-29801-29900-odds-value-list-mode';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
