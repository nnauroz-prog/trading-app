import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 28201-28300 (Endstand-Nachtrag).
const BUILD_MARKER = 'welle-28201-28300-endstand-nachtrag';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
