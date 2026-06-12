import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 31401-31500 (Endstand inline in der Zeile).
const BUILD_MARKER = 'welle-31401-31500-endstand-inline';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
