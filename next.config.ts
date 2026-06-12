import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 31101-31200 (Team-Aliase im Merge + canonicalTeam).
const BUILD_MARKER = 'welle-31101-31200-team-aliase';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
