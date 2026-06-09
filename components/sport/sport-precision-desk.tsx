// Sport Precision Desk — fuehrender Decision-Filter ueber alle Sport-Picks.
//
// Server-rendered. Bekommt LeagueFixtures + WM-Datenquellen, baut intern
// PrecisionPickInput pro Fixture, ruft Gate + Agenten-Gate, selektiert
// Top-5. Zeigt darunter:
//   1. Status-Karte
//   2. Hero-Pick (nur bei FREIGABE)
//   3. Empty-State (nur wenn kein FREIGABE/BEOBACHTEN)
//   4. Agenten-Check
//   5. Minimal-Liste mit max 5 Picks
//
// Liest KEINE WM-Daten direkt — der Caller liefert vor-erzeugte
// PrecisionPickWithAgents-Listen, damit die Komponente pure UI bleibt.

import type {
  CalibrationLabel
} from '@/lib/sport/sport-calibration';
import type {
  PrecisionVerdict
} from '@/lib/sport/sport-precision-gate';
import type {
  PrecisionPickWithAgents
} from '@/lib/sport/sport-precision-bridge';
import {
  selectTopPrecisionPicks,
  topBlockers as topBlockersFn
} from '@/lib/sport/sport-pick-selector';
import { SportAgentCheck } from './sport-agent-check';
import { SportBlockerList } from './sport-blocker-list';
import { SportPrecisionPickCard } from './sport-precision-pick-card';
import { SportPrecisionStatusCard } from './sport-precision-status-card';

interface Props {
  picks: PrecisionPickWithAgents[];
  // Wenn null, deuten wir an, dass keine Kalibrierungs-Historie vorliegt.
  calibrationLabel: CalibrationLabel;
  dataCoveragePct: number;
}

function computeOverallVerdict(picks: PrecisionPickWithAgents[]): PrecisionVerdict {
  if (picks.some((p) => p.verdict === 'FREIGABE')) return 'FREIGABE';
  if (picks.some((p) => p.verdict === 'BEOBACHTEN')) return 'BEOBACHTEN';
  return 'NICHT_VERWENDEN';
}

function collectMissingDataKinds(picks: PrecisionPickWithAgents[]): string[] {
  const set = new Set<string>();
  for (const p of picks) {
    for (const w of p.warnings) {
      if (w.toLowerCase().includes('aufstellung')) set.add('Aufstellungen');
      if (w.toLowerCase().includes('verletzung')) set.add('Verletzungsdaten');
      if (w.toLowerCase().includes('form')) set.add('Form-Datenbasis');
      if (w.toLowerCase().includes('kalibrierung')) set.add('Kalibrierungs-Historie');
    }
  }
  return [...set];
}

function collectBlockedMarkets(picks: PrecisionPickWithAgents[]): string[] {
  const set = new Set<string>();
  for (const p of picks) if (p.verdict === 'NICHT_VERWENDEN') set.add(p.marketType);
  return [...set].slice(0, 6);
}

// Aggregiert pro Agent: status (haerteste Stufe ueber alle Picks) + Anzahl
// betroffener Picks.
function aggregateAgents(picks: PrecisionPickWithAgents[]): Array<{ status: PrecisionPickWithAgents['agentStatuses'][number]; affectedPicks: number }> {
  if (picks.length === 0) return [];
  const ids: Array<PrecisionPickWithAgents['agentStatuses'][number]['id']> = ['data', 'model', 'risk', 'calibration'];
  const labels: Record<string, string> = {
    data: 'Datenpruefer',
    model: 'Modellpruefer',
    risk: 'Risiko-Veto',
    calibration: 'Kalibrierungswaechter'
  };
  return ids.map((id) => {
    let worst: 'OK' | 'WARNUNG' | 'BLOCKIERT' = 'OK';
    let worstReason = '';
    let affected = 0;
    for (const p of picks) {
      const agent = p.agentStatuses.find((a) => a.id === id);
      if (!agent) continue;
      const rank: Record<typeof worst, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
      if (rank[agent.status] > rank[worst]) { worst = agent.status; worstReason = agent.reason; }
      if (agent.status !== 'OK') affected += 1;
    }
    return {
      status: { id, label: labels[id], status: worst, reason: worstReason || 'Alle geprueften Picks sauber.' },
      affectedPicks: affected
    };
  });
}

export function SportPrecisionDesk({ picks, calibrationLabel, dataCoveragePct }: Props) {
  const selection = selectTopPrecisionPicks(picks, { limit: 5, includeRejected: false, allowExplainerWhenEmpty: true });
  const overall = computeOverallVerdict(selection.picks);
  const topBlockerLabel = topBlockersFn(picks)[0]?.label ?? null;
  const hero = selection.picks.find((p) => p.verdict === 'FREIGABE') ?? null;
  const agents = aggregateAgents(picks);
  const missingDataKinds = collectMissingDataKinds(picks);
  const blockedMarkets = collectBlockedMarkets(picks);
  const top3Blockers = topBlockersFn(picks, 3);

  return (
    <section className="space-y-3" aria-label="SPORT PRECISION DESK">
      <SportPrecisionStatusCard
        overallVerdict={overall}
        matchesEvaluated={selection.matchesEvaluated}
        freigabeCount={selection.freigabeCount}
        beobachtenCount={selection.beobachtenCount}
        blockedCount={selection.blockedCount}
        topBlocker={topBlockerLabel}
        dataCoveragePct={dataCoveragePct}
        calibrationLabel={calibrationLabel}
      />

      {hero && (
        <SportPrecisionPickCard pick={hero} hero />
      )}

      {!hero && selection.emptyTopList && (
        <SportBlockerList
          topBlockers={top3Blockers}
          missingDataKinds={missingDataKinds}
          blockedMarkets={blockedMarkets}
          whatWouldUnblock={[
            'Mindestens ein Spiel mit Daten-Confidence ≥ 85 und Quality-Score ≥ 80.',
            'Quellen-Abdeckung ≥ 90 % fuer die betroffene Liga.',
            'Marktstabilitaet STRONG und Modell-Konfluenz LOW-Disagreement.',
            'Bucket-Kalibrierung darf nicht UEBERSCHAETZT sein.'
          ]}
        />
      )}

      <SportAgentCheck agents={agents} />

      {selection.picks.length > 0 && !selection.emptyTopList && (
        <section className="space-y-1.5" aria-label="Geprueft Picks">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Geprueft · max. 5 · ein Pick pro Spiel</div>
          <ul className="space-y-2">
            {selection.picks.map((p) => (
              <li key={`${p.matchId}-${p.marketType}`}>
                <SportPrecisionPickCard pick={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[10px] leading-snug text-slate-500">
        Filter-Logik: Daten-Confidence, Quality-Score, Quellen-Abdeckung, Marktstabilitaet, Modell-Konfluenz, Kalibrierungs-Bucket — alle Pflicht-Kriterien muessen erfuellt sein, damit ein Pick FREIGABE bekommt. Modell-Tendenzen, keine Ergebnis-Zusage. Lieber 0 Picks als 10 mittelmaessige.
      </p>
    </section>
  );
}
