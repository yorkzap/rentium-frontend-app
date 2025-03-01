import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Transendity - International Money Transfer',
  description: 'Send money to India securely and quickly',
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
          'min-h-screen bg-brand-dark antialiased' // Changed bg-background to bg-brand-dark
        )}
      >
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
