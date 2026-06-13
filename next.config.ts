import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 32001-32100 (virtuelle R16 mit Zeiten).
const BUILD_MARKER = 'welle-32001-32100-virtuelle-r16-zeiten';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
