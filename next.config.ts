import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-08 — Welle 19501-19600.
const BUILD_MARKER = 'welle-19501-19600-firma-streak-in-firma-strip';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
