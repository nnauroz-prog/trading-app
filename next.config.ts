import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30301-30400 (WM-Seite radikal aufgeraeumt).
const BUILD_MARKER = 'welle-30301-30400-wm-radikal-aufgeraeumt';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
