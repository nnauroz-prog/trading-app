import { NextRequest, NextResponse } from 'next/server';
import { checkAndAlert } from '@/lib/alerts/signal-alerts';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    const queryKey = request.nextUrl.searchParams.get('key');
    const expected = `Bearer ${secret}`;
    const authorized = header === expected || queryKey === secret;
    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const result = await checkAndAlert();
  return NextResponse.json({
    ok: true,
    ...result,
    notice: result.configured
      ? null
      : 'TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID nicht gesetzt — Engine läuft, aber keine Nachrichten werden verschickt.'
  });
}
