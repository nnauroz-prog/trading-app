import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 32301-32400 (Titles auch fuer / und /sport).
const BUILD_MARKER = 'welle-32301-32400-titles-rund-um';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
