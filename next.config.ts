import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 27601-27700 (WM Eroeffnungstag).
const BUILD_MARKER = 'welle-27601-27700-eroeffnungs-banner';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
