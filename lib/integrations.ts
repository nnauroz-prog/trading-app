// Server-only: liest Env-Variablen und gibt NUR Booleans zurück (nie die
// Secrets selbst), damit der /settings-Überblick zeigen kann, was verbunden ist.

export interface IntegrationEnv {
  name: string;
  set: boolean;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  purpose: string;
  connected: boolean;
  optional: boolean;
  envVars: IntegrationEnv[];
  setup: string;
}

function has(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getIntegrationsStatus(): IntegrationStatus[] {
  const finnhub = has(process.env.FINNHUB_API_KEY);
  const tgToken = has(process.env.TELEGRAM_BOT_TOKEN);
  const tgChat = has(process.env.TELEGRAM_CHAT_ID);
  const sbUrl = has(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const sbAnon = has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const sbService = has(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const coingecko = has(process.env.COINGECKO_API_KEY);

  return [
    {
      id: 'finnhub',
      name: 'Finnhub',
      purpose: 'Live-Aktienkurse & 52-Wochen-Spanne zur Verifikation von Aktien-Ideen.',
      connected: finnhub,
      optional: true,
      envVars: [{ name: 'FINNHUB_API_KEY', set: finnhub }],
      setup: 'Kostenlosen Key auf finnhub.io holen → als FINNHUB_API_KEY in den Vercel-Umgebungsvariablen setzen. Ohne Key bleiben Aktien-Ideen „nicht verifiziert".'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      purpose: 'Push aufs Handy, wenn ein Kurs-Alert auslöst.',
      connected: tgToken && tgChat,
      optional: true,
      envVars: [
        { name: 'TELEGRAM_BOT_TOKEN', set: tgToken },
        { name: 'TELEGRAM_CHAT_ID', set: tgChat }
      ],
      setup: 'Bot via @BotFather erstellen (Token), eigene Chat-ID via @userinfobot holen → beide als TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID setzen.'
    },
    {
      id: 'supabase',
      name: 'Supabase',
      purpose: 'Geräteübergreifende Cloud-Sync deiner Daten (in Vorbereitung).',
      connected: sbUrl && sbAnon,
      optional: true,
      envVars: [
        { name: 'NEXT_PUBLIC_SUPABASE_URL', set: sbUrl },
        { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', set: sbAnon },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', set: sbService }
      ],
      setup: 'Projekt auf supabase.com anlegen → Project URL + anon key + service_role key in die Vercel-Umgebung setzen. Bis dahin: Daten lokal + Export/Import.'
    },
    {
      id: 'coingecko',
      name: 'CoinGecko',
      purpose: 'Höhere Rate-Limits für Krypto-Marktdaten (optional, läuft auch ohne).',
      connected: coingecko,
      optional: true,
      envVars: [{ name: 'COINGECKO_API_KEY', set: coingecko }],
      setup: 'Optional: Demo-API-Key auf coingecko.com holen → als COINGECKO_API_KEY setzen. Ohne Key wird der freie Endpoint genutzt.'
    }
  ];
}
