import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29001-29100 (Morgen-Vorschau).
const BUILD_MARKER = 'welle-29001-29100-morgen-vorschau';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
