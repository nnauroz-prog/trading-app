import { describe, expect, it, afterEach, vi } from 'vitest';
import { getIntegrationsStatus } from '@/lib/integrations';

const ENV_KEYS = [
  'FINNHUB_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'COINGECKO_API_KEY'
];

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

afterEach(() => {
  clearEnv();
  vi.unstubAllEnvs();
});

function byId(id: string) {
  return getIntegrationsStatus().find((i) => i.id === id)!;
}

describe('getIntegrationsStatus', () => {
  it('reports nothing connected on a bare environment', () => {
    clearEnv();
    expect(getIntegrationsStatus().every((i) => !i.connected)).toBe(true);
  });

  it('finnhub connects with a single key', () => {
    clearEnv();
    process.env.FINNHUB_API_KEY = 'abc';
    expect(byId('finnhub').connected).toBe(true);
  });

  it('telegram requires BOTH token and chat id', () => {
    clearEnv();
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    expect(byId('telegram').connected).toBe(false);
    process.env.TELEGRAM_CHAT_ID = '123';
    expect(byId('telegram').connected).toBe(true);
  });

  it('supabase connects on url + anon key (service key not required for connect flag)', () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    expect(byId('supabase').connected).toBe(true);
  });

  it('treats blank/whitespace env as not set', () => {
    clearEnv();
    process.env.FINNHUB_API_KEY = '   ';
    expect(byId('finnhub').connected).toBe(false);
  });

  it('never leaks secret values, only booleans', () => {
    clearEnv();
    process.env.FINNHUB_API_KEY = 'super-secret-token';
    const serialized = JSON.stringify(getIntegrationsStatus());
    expect(serialized).not.toContain('super-secret-token');
  });
});
