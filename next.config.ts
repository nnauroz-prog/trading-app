import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 31501-31600 (Externe Endstaende automatisch ziehen).
const BUILD_MARKER = 'welle-31501-31600-externe-endstaende';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
