import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATH_PREFIXES = ['/login', '/auth/callback', '/api/cron'];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (isPublic) return response;

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const allowed = process.env.ALLOWED_EMAIL?.toLowerCase().trim();
  if (allowed && user.email?.toLowerCase() !== allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=not_allowed', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
