import Link from 'next/link';
import { DataBackupPanel } from '@/components/data-backup-panel';
import { RiskLimitsPanel } from '@/components/risk-limits-panel';
import { OnboardingReplay } from '@/components/onboarding-replay';
import { IntegrationsStatusPanel } from '@/components/integrations-status-panel';
import { getIntegrationsStatus } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const integrations = getIntegrationsStatus();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Einstellungen
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Einstellungen &amp; Integrationen</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Risiko-Schwellen, Integrationen und Daten-Backup. Deine Trading-Daten liegen lokal in diesem Browser.
        </p>
      </header>

      <IntegrationsStatusPanel integrations={integrations} />
      <RiskLimitsPanel />
      <DataBackupPanel />
      <OnboardingReplay />
    </main>
  );
}
