import { NextRequest, NextResponse } from 'next/server';
import { getTelegramConfig, sendTelegramMessage, escapeHtml } from '@/lib/telegram';

interface AlertPayload {
  symbol?: string;
  direction?: 'above' | 'below';
  targetPrice?: number;
  currentPrice?: number;
}

export async function POST(request: NextRequest) {
  const config = getTelegramConfig();
  if (!config) {
    return NextResponse.json({ ok: true, sent: false, reason: 'telegram_not_configured' });
  }

  let body: AlertPayload;
  try {
    body = (await request.json()) as AlertPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  if (!body.symbol || !body.direction || typeof body.targetPrice !== 'number') {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const dir = body.direction === 'above' ? 'über' : 'unter';
  const current = typeof body.currentPrice === 'number' ? ` (aktuell $${body.currentPrice})` : '';
  const text = `🔔 <b>Kurs-Alert: ${escapeHtml(body.symbol)}</b>\n\nZiel ${dir} $${body.targetPrice} erreicht${current}.\n\n<i>Keine Finanzberatung. Eigene Prüfung vor jeder Entscheidung.</i>`;

  const res = await sendTelegramMessage(text, config);
  return NextResponse.json({ ok: res.ok, sent: res.ok, error: res.error });
}
