// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import ClientAuthProvider from '@/components/ClientAuthProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const SITE_URL = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'rentium.ca'}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Rentium — Simply smart rentals',
    template: '%s · Rentium',
  },
  description:
    'Property management built for Canadian tenancy law: compliant leases, condition inspections, deposit rules and a full financial ledger — launching in British Columbia, with a portal your tenants will actually use.',
  applicationName: 'Rentium',
  keywords: [
    'property management',
    'landlord software',
    'BC tenancy',
    'RTB-1 lease',
    'condition inspection',
    'rent ledger',
    'Canada rentals',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Rentium',
    title: 'Rentium — Simply smart rentals',
    description:
      'Compliant leases, condition inspections, deposit rules and an audit-proof ledger — property management built around Canadian tenancy law.',
    locale: 'en_CA',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rentium — Simply smart rentals',
    description:
      'Property management built around Canadian tenancy law, with a portal tenants actually use.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body
        className={cn(
          inter.variable,
          inter.className,
          'min-h-screen antialiased'
        )}
      >
        <ClientAuthProvider>
          <main className="min-h-screen">{children}</main>
          <Toaster position="top-right" richColors />
        </ClientAuthProvider>
      </body>
    </html>
  );
}
