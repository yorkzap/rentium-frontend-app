// page.tsx

'use client';
import { Suspense } from 'react';
import CommunicationHub from '@/components/dashboard/landlord/CommunicationHub';

// CommunicationHub reads a `?c=<id>` deep-link via useSearchParams (opened from
// the Inquiries "Reply" button), so it must sit under a Suspense boundary.
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <CommunicationHub />
    </Suspense>
  );
}
