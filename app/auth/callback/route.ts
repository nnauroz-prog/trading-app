import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.redirect(new URL('/login?error=auth_not_configured', origin));
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', origin));
  }
  return NextResponse.redirect(new URL('/', origin));
}
