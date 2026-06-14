import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 33101-33200 (System-Fix: Welle-Manifest + Share-URL).
const BUILD_MARKER = 'welle-33101-33200-system-fix-bricht-loop';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
