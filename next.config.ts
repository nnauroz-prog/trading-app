import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 28701-28800 (Beste-Quote-Uebernahme).
const BUILD_MARKER = 'welle-28701-28800-beste-quote';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
