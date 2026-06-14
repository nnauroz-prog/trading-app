import type { NextConfig } from 'next';

// Cache-bust marker: bump this when forcing Vercel to rebuild from scratch.
// Last bumped: 2026-06-14 — Welle 32601-32700 (Remis-Tipps sichtbar, MD2/MD3 alle Gruppen).
const BUILD_MARKER = 'welle-32601-32700-remis-md2-md3';

const nextConfig: NextConfig = {
  env: {
    BUILD_MARKER
  }
};

export default nextConfig;
