import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29901-30000 (WM Simple-Picks ganz oben).
const BUILD_MARKER = 'welle-29901-30000-wm-simple-picks';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
