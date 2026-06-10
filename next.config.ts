import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-10 — Welle 25001-25100.
const BUILD_MARKER = 'welle-25001-25100-mismatch-veto-bankroll-ledger';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
