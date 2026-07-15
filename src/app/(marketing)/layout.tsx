// src/app/(marketing)/layout.tsx
// Server layout: the shared public shell. The old version was a client
// component that imported framer-motion (not a direct dependency) and pushed
// container widths through styled-jsx — all of that lives in tokens now.
import SiteHeader from '@/components/public/SiteHeader';
import SiteFooter from '@/components/public/SiteFooter';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
