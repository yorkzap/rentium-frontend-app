'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, XCircle } from 'lucide-react';
import { WobblyCheck } from '@/components/public/illustrations/marks';
import { DJANGO_API_URL } from '@/lib/config';

function VerifyEmailConfirm() {
  const [verificationStatus, setVerificationStatus] = useState<
    'loading' | 'success' | 'error'
  >('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const toastShown = useRef(false);

  const key = searchParams.get('key');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!key) {
        setVerificationStatus('error');
        setErrorMessage('Verification key is missing');
        return;
      }

      try {
        const response = await fetch(
          `${DJANGO_API_URL}/users/verify-email/confirm/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key }),
          }
        );

        let data;
        try {
          data = await response.json();
        } catch {
          data = { detail: 'Invalid server response' };
        }

        if (response.ok) {
          setVerificationStatus('success');
          if (!toastShown.current) {
            toast.success('Email verified successfully!');
            toastShown.current = true;
          }
        } else {
          throw new Error(data.detail || data.error || 'Verification failed');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to verify email';
        setVerificationStatus('error');
        setErrorMessage(message);
        if (!toastShown.current) {
          toast.error(message);
          toastShown.current = true;
        }
      }
    };

    verifyEmail();
  }, [key]);

  const handleContinue = () => {
    router.push(
      verificationStatus === 'success'
        ? '/auth/login?verificationSuccess=true'
        : '/auth/login'
    );
  };

  return (
    <div className="text-center">
      {verificationStatus === 'loading' && (
        <>
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Verifying your email…
          </h1>
          <p className="mt-3 text-sm text-ink-3">This only takes a moment.</p>
        </>
      )}

      {verificationStatus === 'success' && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft">
            <WobblyCheck className="h-7 w-7 text-ok" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
            Email verified
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            You can now log in to your account with your email and password.
          </p>
        </>
      )}

      {verificationStatus === 'error' && (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft">
            <XCircle className="h-6 w-6 text-danger" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
            Verification failed
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            {errorMessage ||
              'The verification link may have expired or is invalid.'}
          </p>
        </>
      )}

      {verificationStatus !== 'loading' && (
        <Button className="mt-8 w-full" onClick={handleContinue}>
          {verificationStatus === 'success'
            ? 'Continue to login'
            : 'Back to login'}
        </Button>
      )}
    </div>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <VerifyEmailConfirm />
    </Suspense>
  );
}
