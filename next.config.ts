import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-13 — Welle 32101-32200 (Turnier-Tipp auch auf /sport).
const BUILD_MARKER = 'welle-32101-32200-turnier-tipp-auf-sport';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
