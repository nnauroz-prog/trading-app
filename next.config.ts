import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30101-30200 (Turnier-Tipp: Gruppen-Endstand + Bracket + Weltmeister).
const BUILD_MARKER = 'welle-30101-30200-turnier-tipp';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
