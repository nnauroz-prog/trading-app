import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-08 — Welle 19801-19900.
const BUILD_MARKER = 'welle-19801-19900-vorstand-lernt-seinen-eigenen-erfolg';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
