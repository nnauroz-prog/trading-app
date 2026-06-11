import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29501-29600 (Tagesdeckel einstellbar).
const BUILD_MARKER = 'welle-29501-29600-tagesdeckel-slider';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
