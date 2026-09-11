import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#080c14',
};

export const metadata: Metadata = {
  title: 'Middle East Conflict Monitor | Saudi Arabia • Yemen • Iran',
  description:
    'Full-stack OSINT and news aggregation dashboard tracking defense, maritime, and security events in Saudi Arabia, Yemen, and Iran.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ME Conflict Monitor',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>" />
      </head>
      <body className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
