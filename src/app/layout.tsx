// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';
import ClientAuthProvider from '@/components/ClientAuthProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Rentium - Simply Smart rentals',
  description: '',
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
          inter.className,
          'min-h-screen bg-brand-dark antialiased'
        )}
      >
        <ClientAuthProvider>
          <main className="min-h-screen">{children}</main>
          <Toaster position="top-right" />
        </ClientAuthProvider>
      </body>
    </html>
  );
}