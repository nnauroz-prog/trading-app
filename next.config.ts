import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 31601-31700 (Confidence-% pro Pick).
const BUILD_MARKER = 'welle-31601-31700-confidence-pro-pick';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
