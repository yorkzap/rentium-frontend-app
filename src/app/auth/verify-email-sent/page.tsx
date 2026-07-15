'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { MailNotice } from '@/components/public/illustrations/spots';

function VerifyEmailSent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="text-center">
      <MailNotice className="mx-auto h-28" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
        Check your email
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-3">
        We sent a verification link to{' '}
        <span className="font-medium text-ink">{email}</span>. Click the link to
        verify your account. If it isn&rsquo;t in your inbox, check your spam folder.
      </p>

      <div className="mt-8 space-y-3">
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/auth/verify-email?email=${email}`}>Resend verification email</Link>
        </Button>
        <Button variant="ghost" className="w-full text-ink-3" asChild>
          <Link href="/auth/login">Return to login</Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <VerifyEmailSent />
    </Suspense>
  );
}
