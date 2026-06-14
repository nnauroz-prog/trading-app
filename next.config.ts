import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 32801-32900 (Tier-1-Quellen-System + 5 Daten-Fixes).
const BUILD_MARKER = 'welle-32801-32900-tier1-quellen-system';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
