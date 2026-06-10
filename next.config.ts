import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-10 — Welle 24401-24500.
const BUILD_MARKER = 'welle-24401-24500-wm-mehr-faktoren-und-datenintegritaet';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
