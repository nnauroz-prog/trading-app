import './globals.css';
import type { Metadata, Viewport } from 'next';
import { BottomNav } from '@/components/bottom-nav';
import { TopNav } from '@/components/top-nav';
import { SiteFooter } from '@/components/site-footer';
import { SkipToContent } from '@/components/skip-to-content';

export const metadata: Metadata = {
  title: {
    default: 'Trading Desk · Krypto, Aktien, Rohstoffe, Sport',
    template: '%s · Trading Desk'
  },
  description: 'Modell-basierte Tageshinweise fuer Krypto, Aktien, Rohstoffe und Sport — transparent mit offener Datenherkunft. Kein Anlageratschlag.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Trading Desk'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  },
  // Privates Decision-Support-Tool — explizit nicht fuer
  // Google-Indexierung gedacht. Hindert auch andere Crawler.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  },
  openGraph: {
    title: 'Trading Desk · Krypto, Aktien, Rohstoffe, Sport',
    description: 'Modell-basierte Tageshinweise. Transparent, mit offener Datenherkunft. Kein Anlageratschlag.',
    type: 'website',
    locale: 'de_DE',
    siteName: 'Trading Desk'
  },
  twitter: {
    card: 'summary',
    title: 'Trading Desk',
    description: 'Modell-basierte Tageshinweise fuer Krypto, Aktien, Rohstoffe, Sport.'
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
        <SkipToContent />
        <TopNav />
        <div id="main-content">
          {children}
        </div>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
