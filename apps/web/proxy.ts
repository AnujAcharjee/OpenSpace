import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/user', '/settings', '/profile'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    const token =
      request.cookies.get('accessToken')?.value ||
      request.cookies.get('collab_token')?.value;

    if (!token) {
      const returnUrl = encodeURIComponent(`${pathname}${search}`);
      const signInUrl = new URL(`/signin?returnUrl=${returnUrl}`, request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/user/:path*', '/settings/:path*', '/profile/:path*'],
};
