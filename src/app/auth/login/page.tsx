'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Card className="w-[380px]">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-2xl text-slate-900">
            Welcome back
          </CardTitle>
          <CardDescription>
            New to Transendity?{' '}
            <Link
              href="/auth/signup"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              Sign up
            </Link>
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900">
                Your email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="bg-slate-50 border-slate-200 focus:border-teal-600 focus:ring-teal-600"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-900">
                  Your password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-teal-600 hover:text-teal-700 text-sm"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                className="bg-slate-50 border-slate-200 focus:border-teal-600 focus:ring-teal-600"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Signing in...
                </div>
              ) : (
                'Log in'
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-600">
                  Or log in with
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </Button>
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-1.745 0-2.513.829-2.513 2.437v1.543h3.93l-.772 3.667h-3.158v7.98H9.101z" />
                </svg>
              </Button>
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
