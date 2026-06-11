import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-11 — Welle 30501-30600 (Alle 12 Gruppen + Weltmeister-Kette komplett).
const BUILD_MARKER = 'welle-30501-30600-weltmeister-kette-komplett';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
