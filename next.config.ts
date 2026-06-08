import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-08 — Welle 20401-20500.
const BUILD_MARKER = 'welle-20401-20500-trading-today-mit-track-record';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
