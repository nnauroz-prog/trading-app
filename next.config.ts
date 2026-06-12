import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 31301-31400 (LIVE-Banner oben + Spiele-Anzahl pro Tag).
const BUILD_MARKER = 'welle-31301-31400-live-banner-und-anzahl';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
