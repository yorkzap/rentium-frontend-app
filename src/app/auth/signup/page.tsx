'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DJANGO_API_URL } from '@/lib/config';

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

export default function Page() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    user_type: 'LANDLORD', // Default to landlord
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && formData.email) {
      setStep(2);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${DJANGO_API_URL}/users/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('A user with this email already exists');
        } else {
          throw new Error(data.error || 'Registration failed');
        }
      }

      router.push('/auth/login?registered=true');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Create your Rentium account
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-brand hover:text-brand-hover">
          Log in
        </Link>
      </p>

      {/* Step indicator: two steps, no mystery about where you are */}
      <div className="mt-6 flex items-center gap-2" aria-hidden>
        {[1, 2].map((s) => (
          <span
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-brand' : 'bg-surface-sunken',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-4">
        Step {step} of 2 — {step === 1 ? 'your email' : 'about you'}
      </p>

      <form onSubmit={step === 1 ? handleNextStep : onSubmit} className="mt-6 space-y-5">
        {error && (
          <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger-ink" role="alert">
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
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        )}

        {step === 2 && (
          <>
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
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                autoComplete="tel"
                required
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">I am a…</legend>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, user_type: role.value })}
                    aria-pressed={formData.user_type === role.value}
                    className={cn(
                      'rounded-lg border p-4 text-center transition-colors',
                      formData.user_type === role.value
                        ? 'border-brand bg-brand-soft text-brand-ink'
                        : 'border-line text-ink-2 hover:border-line-strong',
                    )}
                  >
                    <role.icon className="mx-auto h-5 w-5" />
                    <span className="mt-2 block text-sm font-medium">{role.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-4">{role.body}</span>
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
            onClick={() => setStep(1)}
          >
            Back
          </Button>
        )}

        {/* TODO(local): link Terms of use / Privacy Policy once those pages exist */}
        <p className="text-center text-xs leading-5 text-ink-4">
          By registering, you accept our Terms of use and Privacy Policy.
        </p>
      </form>
    </div>
  );
}
