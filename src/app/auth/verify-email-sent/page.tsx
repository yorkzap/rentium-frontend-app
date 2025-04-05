'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VerifyEmailSentPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Card className="w-[480px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to <span className="font-medium">{email}</span>. Please check your email and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <p className="text-slate-600 text-center mb-4">
            If you don't see the email in your inbox, please check your spam folder or click below to request a new verification email.
          </p>
          
          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <Link href={`/auth/verify-email?email=${email}`}>Resend verification email</Link>
          </Button>
          
          <Button
            variant="ghost"
            className="text-slate-500 hover:text-slate-700"
            asChild
          >
            <Link href="/auth/login">Return to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}