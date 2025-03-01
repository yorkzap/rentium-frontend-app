import MainNav from '@/components/nav/main-nav';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainNav />
      {children}
    </>
  );
}
