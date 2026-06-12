import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30801-30900 (Filter ab heute + Heute-Sprungbutton).
const BUILD_MARKER = 'welle-30801-30900-filter-ab-heute';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
