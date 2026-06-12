import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 31001-31100 (Anstosszeiten in Berlin).
const BUILD_MARKER = 'welle-31001-31100-zeiten-berlin';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
