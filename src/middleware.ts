import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const protectedPaths = ['/dashboard', '/settings']; // Add protected routes
  const pathname = request.nextUrl.pathname;

  // Placeholder logic: Always allow access for now
  if (protectedPaths.includes(pathname)) {
    // TODO: Replace with actual auth logic when ready
    console.log('Protected route accessed:', pathname);
  }

  // Allow access to all routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'], // Adjust matchers as needed
};
