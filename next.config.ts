import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-07 — Welle 18801-18900.
const BUILD_MARKER = 'welle-18801-18900-bug-hunt-sport-prognose';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
