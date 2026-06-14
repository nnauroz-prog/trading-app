import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 33001-33100 (Level-3+: Team-Dupes, Engine-Bias, Security, Perf).
const BUILD_MARKER = 'welle-33001-33100-level3-plus';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
