import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30701-30800 (Heute hervorgehoben + Endstand-Anzeige).
const BUILD_MARKER = 'welle-30701-30800-heute-und-endstand';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
