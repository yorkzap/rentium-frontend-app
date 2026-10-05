// page.tsx

'use client';
import { Suspense } from 'react';
import MoneyWorkspace from '@/components/dashboard/landlord/MoneyWorkspace';
export default function FinancialPage() {
  return (
    <Suspense fallback={<p>Loading money workspace…</p>}>
      <MoneyWorkspace />
    </Suspense>
  );
}
