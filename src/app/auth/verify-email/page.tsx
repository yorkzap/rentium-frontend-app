'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
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
      const response = await fetch('http://localhost:8000/api/users/resend-verification/', {
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
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    router.push(`/auth/login?requiresVerification=true`);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Card className="w-[480px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-slate-900">
            Verify Your Email Address
          </CardTitle>
          <CardDescription className="text-base">
            {email ? (
              <>We've sent a verification email to <span className="font-medium">{email}</span></>
            ) : (
              'Please check your email for the verification link'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-blue-700 text-sm rounded-r-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="ml-3">
                <p className="font-medium">Your account needs verification</p>
                <p className="mt-1">You must verify your email address before you can log in.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Mail className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">
              Please check your email and click the verification link to complete your registration.
              If you don't see the email in your inbox, please check your spam folder.
            </p>
          </div>
          
          {/* Resend success message */}
          {resendSuccess && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 text-green-700 text-sm rounded-r-md mt-4">
              <p className="font-medium">Verification email sent!</p>
              <p className="mt-1">A new verification email has been sent. Please check your inbox and spam folder.</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 p-6 pt-2">
          {email && (
            <Button
              onClick={handleResendVerification}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isResending}
            >
              {isResending ? (
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Sending verification email...
                </div>
              ) : (
                'Resend verification email'
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            className="w-full border-slate-200 hover:bg-slate-50"
            onClick={handleGoToLogin}
          >
            Return to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}