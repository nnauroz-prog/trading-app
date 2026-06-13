import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 31801-31900 (Zeitzonen-Bugfix: Reise-robust).
const BUILD_MARKER = 'welle-31801-31900-tz-bugfix';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
