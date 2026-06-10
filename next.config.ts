import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-10 — Welle 26201-26300.
const BUILD_MARKER = 'welle-26201-26300-tipp-erklaer';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
