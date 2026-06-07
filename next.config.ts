import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-01 — Welle 58.
const BUILD_MARKER = 'welle-18301-18400-sport-synthese-tests-perLeagueTopPicks-dailyTopPick';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
