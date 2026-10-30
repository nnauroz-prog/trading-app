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
  themeColor: '#0b1022'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        {/* Display-Schrift fuer Ueberschriften. Browser-Link (nicht next/font),
            damit der Build ohne externen Font-Download funktioniert; faellt
            sauber auf System-Schrift zurueck, falls blockiert. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <SkipToContent />
        <TopNav />
        <div className="app-workspace">
          <div id="main-content" tabIndex={-1}>{children}</div>
          <SiteFooter />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
