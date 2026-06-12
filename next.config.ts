import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30901-31000 (Live-Spielplan aus TheSportsDB merge).
const BUILD_MARKER = 'welle-30901-31000-tsdb-schedule-merge';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
