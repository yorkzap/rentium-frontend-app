'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DJANGO_API_URL } from '@/lib/config';
import { WobblyCheck } from '@/components/public/illustrations/marks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

const ROLES = [
  {
    value: 'LANDLORD',
    icon: Building2,
    title: 'Landlord',
    body: 'I rent out property',
  },
  {
    value: 'TENANT',
    icon: User,
    title: 'Tenant',
    body: 'I want to find a rental',
  },
] as const;

type FieldErrors = {
  email?: string;
  password?: string;
  phone?: string;
};

export default function Page() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    user_type: 'LANDLORD',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  // When signup fails because email/phone is taken, keep the user on step 2
  // with those fields editable in place (no need to hit Back).
  const [showEmailOnStep2, setShowEmailOnStep2] = useState(false);

  // Prefill the email when arriving from an invite link
  // (e.g. co-landlord invite: /auth/signup?email=...).
  useEffect(() => {
    const invited = new URLSearchParams(window.location.search).get('email');
    if (invited && EMAIL_RE.test(invited)) {
      setFormData((prev) => ({ ...prev, email: invited }));
    }
  }, []);

  const clearFieldError = (id: keyof FieldErrors) => {
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    setError('');
    if (id === 'email' || id === 'password' || id === 'phone') {
      clearFieldError(id);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(formData.email)) {
      setFieldErrors({ email: "That doesn't look like an email address." });
      return;
    }
    setFieldErrors({});
    setError('');
    setShowEmailOnStep2(false);
    setStep(2);
  };

  const validateStep2 = (): boolean => {
    const next: FieldErrors = {};
    if (!EMAIL_RE.test(formData.email.trim())) {
      next.email = "That doesn't look like an email address.";
      setShowEmailOnStep2(true);
    }
    if (formData.password.length < MIN_PASSWORD) {
      next.password = `Use at least ${MIN_PASSWORD} characters — it's protecting your financial records.`;
    }
    if (!formData.phone.trim()) {
      next.phone = 'Phone number is required.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateStep2()) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${DJANGO_API_URL}/users/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: formData.email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const isEmailTaken =
          response.status === 409 ||
          data.code === 'EMAIL_EXISTS' ||
          data.field === 'email' ||
          data.code === 'EMAIL_INVALID';
        const isPhoneTaken =
          data.code === 'PHONE_EXISTS' ||
          data.field === 'phone' ||
          data.code === 'PHONE_INVALID';

        if (isEmailTaken) {
          const msg =
            data.error ||
            data.errors?.email?.[0] ||
            'An account with this email already exists.';
          setFieldErrors({ email: msg });
          setShowEmailOnStep2(true);
          setError('');
          return;
        }
        if (isPhoneTaken) {
          const msg =
            data.error ||
            data.errors?.phone?.[0] ||
            'This phone number is already used on another account.';
          setFieldErrors({ phone: msg });
          setError('');
          return;
        }
        throw new Error(data.error || data.detail || 'Registration failed');
      }

      if (data.email_sent === false) {
        router.push('/auth/login?registered=true&emailPending=true');
        return;
      }
      router.push('/auth/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card border-t-2 border-t-brand p-8 shadow-[0_18px_45px_-30px_rgba(14,42,46,0.3)]">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Create your Rentium account
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Log in
        </Link>
      </p>

      <div className="mt-6 flex items-center gap-2" aria-hidden>
        {[1, 2].map((s) => (
          <span
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-brand' : 'bg-surface-sunken'
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-4">
        Step {step} of 2 — {step === 1 ? 'your email' : 'about you'}
      </p>

      <form
        onSubmit={step === 1 ? handleNextStep : onSubmit}
        className="mt-6 space-y-5"
      >
        {error && (
          <div
            className="rounded-lg bg-danger-soft p-3 text-sm text-danger-ink"
            role="alert"
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              autoFocus
              required
              aria-invalid={!!fieldErrors.email}
              value={formData.email}
              onChange={handleChange}
            />
            {fieldErrors.email && (
              <p className="text-xs text-danger-ink" role="alert">
                {fieldErrors.email}
              </p>
            )}
            <p className="text-xs text-ink-4">
              We&rsquo;ll send a verification link here — nothing else, no spam.
            </p>
          </div>
        )}

        {step === 2 && (
          <>
            {/* Email always visible on step 2 so conflicts can be fixed in place */}
            {(showEmailOnStep2 || fieldErrors.email) && (
              <div className="space-y-2 rounded-lg border border-danger/30 bg-danger-soft/40 p-3">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus={!!fieldErrors.email}
                  required
                  aria-invalid={!!fieldErrors.email}
                  value={formData.email}
                  onChange={handleChange}
                />
                {fieldErrors.email ? (
                  <div
                    className="space-y-1.5 text-xs text-danger-ink"
                    role="alert"
                  >
                    <p>{fieldErrors.email}</p>
                    <p className="text-ink-3">
                      Change it above and try again, or{' '}
                      <Link
                        href="/auth/login"
                        className="font-medium text-brand hover:underline"
                      >
                        log in
                      </Link>
                      {' · '}
                      <Link
                        href="/auth/forgot-password"
                        className="font-medium text-brand hover:underline"
                      >
                        forgot password
                      </Link>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-ink-4">
                    Verification will go here.
                  </p>
                )}
              </div>
            )}

            {!showEmailOnStep2 && !fieldErrors.email && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm">
                <span className="truncate text-ink-3">
                  <span className="text-ink-4">Email · </span>
                  {formData.email}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-brand hover:underline"
                  onClick={() => setShowEmailOnStep2(true)}
                >
                  Change
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Full name"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create a password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  aria-invalid={!!fieldErrors.password}
                  className="pr-10"
                  value={formData.password}
                  onChange={handleChange}
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
              {fieldErrors.password ? (
                <p className="text-xs text-danger-ink" role="alert">
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="text-xs text-ink-4">
                  At least {MIN_PASSWORD} characters.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                autoComplete="tel"
                required
                aria-invalid={!!fieldErrors.phone}
                value={formData.phone}
                onChange={handleChange}
              />
              {fieldErrors.phone ? (
                <div className="space-y-1 text-xs text-danger-ink" role="alert">
                  <p>{fieldErrors.phone}</p>
                  <p className="text-ink-3">
                    Enter a different number above, then create account again.
                  </p>
                </div>
              ) : null}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">I am a…</legend>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, user_type: role.value })
                    }
                    aria-pressed={formData.user_type === role.value}
                    className={cn(
                      'relative rounded-lg border p-4 text-center transition-all',
                      formData.user_type === role.value
                        ? 'border-brand bg-brand-soft text-brand-ink shadow-[0_8px_20px_-14px_rgba(15,118,110,0.5)]'
                        : 'border-line text-ink-2 hover:-translate-y-0.5 hover:border-line-strong'
                    )}
                  >
                    {formData.user_type === role.value && (
                      <span className="absolute right-2 top-2">
                        <WobblyCheck className="h-4 w-4 text-brand" />
                      </span>
                    )}
                    <role.icon className="mx-auto h-5 w-5" />
                    <span className="mt-2 block text-sm font-medium">
                      {role.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-4">
                      {role.body}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {step === 1 ? 'One moment…' : 'Creating account…'}
            </>
          ) : step === 1 ? (
            'Continue'
          ) : (
            'Create account'
          )}
        </Button>

        {step === 2 && (
          <Button
            variant="ghost"
            className="w-full text-ink-3"
            type="button"
            onClick={() => {
              setStep(1);
              setFieldErrors({});
              setShowEmailOnStep2(false);
            }}
          >
            Back
          </Button>
        )}

        <p className="text-center text-xs leading-5 text-ink-4">
          By registering, you accept our Terms of use and Privacy Policy.
        </p>
      </form>
    </div>
  );
}
