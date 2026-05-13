import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Decision Support',
  description: 'Transparent crypto and stock decision support system (no financial advice).'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
