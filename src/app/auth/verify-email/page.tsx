'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { DJANGO_API_URL } from '@/lib/config';

function VerifyEmail() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    // If there's no email parameter, redirect to login
    if (!email) {
      router.push('/auth/login');
    }
  }, [email, router]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address is missing');
      return;
    }

    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch(`${DJANGO_API_URL}/users/resend-verification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification email sent. Please check your inbox.');
        setResendSuccess(true);
      } else {
        throw new Error(data.error || data.detail || 'Failed to resend verification email');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
        <Mail className="h-6 w-6 text-brand" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
        Verify your email address
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-3">
        {email ? (
          <>
            We&rsquo;ve sent a verification email to{' '}
            <span className="font-medium text-ink">{email}</span>. You&rsquo;ll
            need to verify before you can log in — check your spam folder if
            it&rsquo;s not in your inbox.
          </>
        ) : (
          'Please check your email for the verification link.'
        )}
      </p>

      {resendSuccess && (
        <div className="mt-6 rounded-lg bg-ok-soft p-4 text-left text-sm text-ok-ink" role="status">
          <p className="font-medium">Verification email sent!</p>
          <p className="mt-1">
            A new verification email is on its way. Check your inbox and spam folder.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {email && (
          <Button className="w-full" onClick={handleResendVerification} disabled={isResending}>
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Resend verification email'
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full text-ink-3"
          onClick={() => router.push('/auth/login?requiresVerification=true')}
        >
          Return to login
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <VerifyEmail />
    </Suspense>
  );
}
