import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 28401-28500 (Tab-Titel-Wecker).
const BUILD_MARKER = 'welle-28401-28500-tab-titel-wecker';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
