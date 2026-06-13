import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 31901-32000 (Bracket bis Finale + KO-Confidence).
const BUILD_MARKER = 'welle-31901-32000-bracket-finale';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
