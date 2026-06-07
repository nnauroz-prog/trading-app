import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-07 — Welle 18701-18800.
const BUILD_MARKER = 'welle-18701-18800-krypto-auf-heute-sicher';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
