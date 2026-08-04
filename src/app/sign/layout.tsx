// Public shell for the form-signing flow. No auth anywhere below this.
import SiteFooter from '@/components/public/SiteFooter';
import SiteHeader from '@/components/public/SiteHeader';

export default function SignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
