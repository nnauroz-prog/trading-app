import './globals.css';
import type { Metadata, Viewport } from 'next';
import { BottomNav } from '@/components/bottom-nav';
import { TopNav } from '@/components/top-nav';

export const metadata: Metadata = {
  title: 'Market Decision Support',
  description: 'Transparent crypto and stock decision support system (no financial advice).',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Trading Desk'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020617'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen pb-14 md:pb-0">
        <TopNav />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
