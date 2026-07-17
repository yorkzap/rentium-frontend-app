'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DJANGO_API_URL } from '@/lib/config';
import { WobblyCheck } from '@/components/public/illustrations/marks';

const MIN_PASSWORD = 8;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const linkMissing = !uid || !token;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (linkMissing) return;
    if (password.length < MIN_PASSWORD) {
      toast.error(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/users/password-reset/confirm/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, token, password }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.detail || 'This reset link is invalid or has expired.'
        );
      }
      setDone(true);
      toast.success('Password updated. You can log in now.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not reset password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (linkMissing) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-1">
          Link incomplete
        </h1>
        <p className="text-sm text-ink-3">
          This page needs a full reset link from your email. Request a new one
          from the login page.
        </p>
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
          <WobblyCheck className="h-12 w-12 text-[hsl(var(--brand))]" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-1">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          Sign in with your new password. Old sessions may still work until they
          expire — if you&apos;re on a shared device, log out there too.
        </p>
        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={() => router.push('/auth/login')}
        >
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-1">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        At least {MIN_PASSWORD} characters. Pick something you don&apos;t reuse
        elsewhere — this protects your leases and ledgers.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-4 transition-colors hover:text-ink-2"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={MIN_PASSWORD}
          />
        </div>
        <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Update password'
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
