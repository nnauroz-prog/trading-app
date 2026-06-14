import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 32701-32800 (Spielplan komplett verifiziert).
const BUILD_MARKER = 'welle-32701-32800-spielplan-verifiziert';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
