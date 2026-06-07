import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-07 — Welle 18401-18500.
const BUILD_MARKER = 'welle-18401-18500-cross-persona-takes-per-coin';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
