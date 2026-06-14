import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 32501-32600 (Komplette MD1 + Neuseeland-Origin).
const BUILD_MARKER = 'welle-32501-32600-md1-komplett';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
