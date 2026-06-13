import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 32401-32500 (Akute Spiele nachgepflegt).
const BUILD_MARKER = 'welle-32401-32500-akute-spiele';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
