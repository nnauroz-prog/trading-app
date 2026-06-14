import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 17201-17300 (WM-Prognose-Dashboard mit Hero + Top 8 + Match-Cards).
const BUILD_MARKER = 'welle-17201-17300-wm-prognose-dashboard';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
