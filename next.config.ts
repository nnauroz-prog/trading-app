import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30201-30300 (Gruppen-Auslosung als Lookup, 10 von 12 Gruppen).
const BUILD_MARKER = 'welle-30201-30300-gruppen-auslosung-lookup';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
