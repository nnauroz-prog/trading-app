import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-08 — Welle 22301-22400.
const BUILD_MARKER = 'welle-22301-22400-coin-override-effect-banner';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
