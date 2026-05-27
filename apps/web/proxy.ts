import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const isPublicPath = (pathname: string) =>
  pathname === '/login' ||
  pathname.startsWith('/api/auth') ||
  pathname.startsWith('/_next') ||
  pathname === '/favicon.ico' ||
  pathname === '/unicornlogo.png';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const expectedTenantId = process.env.AZURE_AD_TENANT_ID;
  const tokenTenantId = typeof token?.tid === 'string' ? token.tid : null;
  const isAuthorized = Boolean(token && expectedTenantId && tokenTenantId === expectedTenantId);

  if (isAuthorized) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!.*\\.[\\w]+$).*)', '/api/:path*'],
};
