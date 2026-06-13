import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 31701-31800 (Team-Suche in der Karte).
const BUILD_MARKER = 'welle-31701-31800-team-suche';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
