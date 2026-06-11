import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 29701-29800 (Manuelle Quoten opt-in merken).
const BUILD_MARKER = 'welle-29701-29800-manuelle-quoten-merken';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
