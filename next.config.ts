import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-07 — Welle 18601-18700.
const BUILD_MARKER = 'welle-18601-18700-per-coin-subagent-detail';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
