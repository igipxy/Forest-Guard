import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/health', '/favicon.ico'];

function hasValidSessionCookie(request: NextRequest): boolean {
  const allCookies = request.cookies.getAll();
  return allCookies.some(
    (c) =>
      c.name === 'fg_session' ||
      (c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && Boolean(c.value))
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  // API routes enforce authentication and RBAC inside their own server route handlers
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== 'false';
  const isAuthenticated = hasValidSessionCookie(request);

  if (!isDemoMode && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};