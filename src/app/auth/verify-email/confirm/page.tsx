'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function VerifyEmailConfirmPage() {
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const toastShown = useRef(false);
  
  // Get the key parameter from the URL
  const key = searchParams.get('key');

  useEffect(() => {
    const verifyEmail = async () => {
      // Check if we have the necessary parameters
      if (!key) {
        setVerificationStatus('error');
        setErrorMessage('Verification key is missing');
        return;
      }

      try {
        // Use the correct API endpoint matching your backend
        const apiUrl = 'http://localhost:8000/api/users/verify-email/confirm/';
        
        console.log('Sending verification request with key:', key);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key }),
        });

        // Parse the response
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Error parsing response:', e);
          data = { detail: 'Invalid server response' };
        }

        console.log('Verification response:', response.status, data);

        if (response.ok) {
          setVerificationStatus('success');
          // Use a ref to ensure toast only shows once
          if (!toastShown.current) {
            toast.success('Email verified successfully!');
            toastShown.current = true;
          }
        } else {
          throw new Error(data.detail || data.error || 'Verification failed');
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setVerificationStatus('error');
        setErrorMessage(error.message || 'Failed to verify email');
        if (!toastShown.current) {
          toast.error(error.message || 'Failed to verify email');
          toastShown.current = true;
        }
      }
    };

    verifyEmail();
  }, [key]);

  const handleContinue = () => {
    if (verificationStatus === 'success') {
      // Add query parameter to indicate successful verification
      router.push('/auth/login?verificationSuccess=true');
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Card className="w-[480px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-slate-900">
            Email Verification
          </CardTitle>
          <CardDescription className="text-base">
            {verificationStatus === 'loading' && 'Verifying your email...'}
            {verificationStatus === 'success' && 'Your email has been successfully verified!'}
            {verificationStatus === 'error' && (errorMessage || 'Failed to verify email')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus === 'loading' && (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-600 mb-4">
                You can now log in to your account with your email and password.
              </p>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-slate-600 mb-4">
                There was a problem verifying your email. The verification link may have expired or is invalid.
              </p>
            </div>
          )}
          
          {verificationStatus !== 'loading' && (
            <Button
              onClick={handleContinue}
              className={verificationStatus === 'success' ? 'bg-teal-600 hover:bg-teal-700 text-white w-full' : 'border-slate-200 w-full'}
            >
              {verificationStatus === 'success' ? 'Continue to Login' : 'Back to Login'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}