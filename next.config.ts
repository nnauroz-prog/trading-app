import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30401-30500 (Turnier-Tipp: nur Gewinner).
const BUILD_MARKER = 'welle-30401-30500-turnier-nur-gewinner';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
