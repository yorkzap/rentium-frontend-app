// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import ClientAuthProvider from '@/components/ClientAuthProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'Rentium — Simply smart rentals',
    template: '%s · Rentium',
  },
  description:
    'Property management built for BC landlords: compliant leases, condition inspections, deposit rules and a full financial ledger — with a portal your tenants will actually use.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body
        className={cn(inter.variable, inter.className, 'min-h-screen antialiased')}
      >
        <ClientAuthProvider>
          <main className="min-h-screen">{children}</main>
          <Toaster position="top-right" richColors />
        </ClientAuthProvider>
      </body>
    </html>
  );
}
