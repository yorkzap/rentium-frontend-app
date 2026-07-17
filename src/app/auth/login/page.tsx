'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { DJANGO_API_URL } from '@/lib/config';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [redirected, setRedirected] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading } = useAuth();

  // Use useRef to track if toasts have been shown
  const toastsShownRef = useRef(false);

  // Check for query parameters
  const requiresVerification = searchParams.get('requiresVerification');
  const verificationSuccess = searchParams.get('verificationSuccess');
  const registered = searchParams.get('registered');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && !redirected) {
      setRedirected(true);
      // Short delay prevents a flicker between auth resolving and navigation
      setTimeout(() => {
        router.push('/dashboard');
      }, 300);
    }
  }, [isAuthenticated, loading, redirected, router]);

  // Show appropriate messages based on query parameters - only once
  useEffect(() => {
    if (toastsShownRef.current) return;

    if (
      requiresVerification === 'true' ||
      verificationSuccess === 'true' ||
      registered === 'true'
    ) {
      if (requiresVerification === 'true') {
        toast.warning('Please verify your email address before logging in');
      }
      if (verificationSuccess === 'true') {
        toast.success('Email verified successfully! You can now log in');
      }
      if (registered === 'true') {
        toast.success(
          'Registration successful! Please check your email to verify your account'
        );
      }
      toastsShownRef.current = true;
    }
  }, [requiresVerification, verificationSuccess, registered]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setVerificationNeeded(false);

    try {
      const response = await fetch(`${DJANGO_API_URL}/auth-token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Logged in successfully');
        await login(data.token, email);
        setRedirected(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
        return;
      } else {
        // Special handling for 403 Forbidden - Email not verified
        if (
          response.status === 403 &&
          data.detail &&
          data.detail.includes('Email not verified')
        ) {
          setVerificationNeeded(true);
          setIsLoading(false);
          return;
        }

        throw new Error(
          data.detail ||
            (data.non_field_errors && data.non_field_errors[0]) ||
            'Invalid login credentials'
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log in');
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address is missing');
      return;
    }
    setIsResending(true);

    try {
      const response = await fetch(
        `${DJANGO_API_URL}/users/resend-verification/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        toast.success('Verification email sent. Please check your inbox.');
      } else {
        throw new Error(
          data.error || data.detail || 'Failed to resend verification email'
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to resend verification email'
      );
    } finally {
      setIsResending(false);
    }
  };

  // If the user is already authenticated, show a quiet transition state
  if (loading || (isAuthenticated && !redirected)) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-3 text-sm">
          {loading ? 'Checking your session…' : 'Opening your dashboard…'}
        </span>
      </div>
    );
  }

  return (
    <div className="card border-t-2 border-t-brand p-8 shadow-[0_18px_45px_-30px_rgba(14,42,46,0.3)]">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        New to Rentium?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Create an account
        </Link>
      </p>

      {verificationNeeded && (
        <div className="mt-6 rounded-lg border border-warn/40 bg-warn-soft p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warn-ink" />
            <div>
              <h2 className="text-sm font-medium text-warn-ink">
                Email verification required
              </h2>
              <p className="mt-1 text-sm text-warn-ink/90">
                Your account needs to be verified before you can log in.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-3 w-full border-warn/40 bg-white text-warn-ink hover:bg-warn-soft"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Resend verification email'
            )}
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-[hsl(var(--brand))] underline-offset-4 transition-colors hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
        <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Log in'
          )}
        </Button>
        <p className="text-center text-sm text-ink-3">
          <Link
            href="/auth/forgot-password"
            className="font-medium text-[hsl(var(--brand))] underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
        <p className="text-center text-xs text-ink-4">
          New here? Your first 30 days are free — no credit card.
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
