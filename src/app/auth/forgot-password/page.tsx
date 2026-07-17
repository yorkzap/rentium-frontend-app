'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { DJANGO_API_URL } from '@/lib/config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("That doesn't look like an email address.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${DJANGO_API_URL}/users/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Could not start password reset.');
      }
      setSent(true);
      toast.success('Check your email for a reset link.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not start password reset.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <Link
        href="/auth/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-ink-1">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        Enter the email on your account. If it matches, we&apos;ll send a
        one-time link to choose a new password.
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-sm text-ink-2">
          <p className="font-medium text-ink-1">
            Email sent (if the account exists)
          </p>
          <p className="mt-2 text-ink-3">
            Check <strong className="text-ink-2">{email}</strong> for a message
            from Rentium. The link expires after a short time. Didn&apos;t get
            it? Check spam, or try again in a few minutes.
          </p>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link href="/auth/login">Return to login</Link>
          </Button>
        </div>
      ) : (
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
          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
