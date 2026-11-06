import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Allow CORS from Monitoring Dashboard on /api/v1/* endpoints
  if (pathname.startsWith('/api/v1/')) {
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Internal-Api-Key, Authorization'
    );

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};