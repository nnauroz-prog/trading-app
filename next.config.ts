import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 32901-33000 (Level-3-Audit: 16 Bugs + UX + Invariant-Tests).
const BUILD_MARKER = 'welle-32901-33000-level3-audit';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
