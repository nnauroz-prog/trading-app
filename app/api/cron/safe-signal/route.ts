import { NextRequest, NextResponse } from 'next/server';
import { checkSafeSignalAndAlert } from '@/lib/alerts/safe-signal-alert';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    const queryKey = request.nextUrl.searchParams.get('key');
    const authorized = header === `Bearer ${secret}` || queryKey === secret;
    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const result = await checkSafeSignalAndAlert();
  return NextResponse.json({
    ok: true,
    ...result,
    notice: result.configured
      ? null
      : 'TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID nicht gesetzt — kein Telegram-Versand. Prüfung läuft trotzdem.'
  });
}
