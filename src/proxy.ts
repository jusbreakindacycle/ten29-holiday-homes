import { timingSafeEqual, createHash } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

function sameSecret(actual: string, expected: string): boolean {
  return timingSafeEqual(createHash('sha256').update(actual).digest(), createHash('sha256').update(expected).digest());
}

export async function proxy(request: NextRequest) {
  if (process.env.TEN29_ENVIRONMENT === 'staging') {
    const username = process.env.TEN29_STAGING_ACCESS_USER;
    const password = process.env.TEN29_STAGING_ACCESS_PASSWORD;
    if (!username || !password || password.length < 24) {
      return new NextResponse('Staging access is not configured.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const authorization = request.headers.get('authorization') ?? '';
    let suppliedUser = '';
    let suppliedPassword = '';
    try {
      if (authorization.startsWith('Basic ')) {
        const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator >= 0) {
          suppliedUser = decoded.slice(0, separator);
          suppliedPassword = decoded.slice(separator + 1);
        }
      }
    } catch { /* Fail closed below. */ }
    if (!sameSecret(suppliedUser, username) || !sameSecret(suppliedPassword, password)) {
      return new NextResponse('Staging access required.', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="TEN29 staging", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
      });
    }
  }

  if (!request.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !request.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
