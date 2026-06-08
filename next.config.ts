import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-08 — Welle 20101-20200.
const BUILD_MARKER = 'welle-20101-20200-akademie-lern-loop-auf-home';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
