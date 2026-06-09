// Sammelt alle Headless-Recorder, die die Lern-Schleifen fuettern, in eine
// einzige Komponente. Rendern selbst nichts sichtbares — sie schreiben nur
// in localStorage, sobald die Home aufgerufen wird.
//
// Vorher lagen die 5 Recorder einzeln auf der Home und liessen sie unnoetig
// laenger wirken. Jetzt: ein Mount, kein visueller Footprint.

import { AgentRecorder } from '@/components/agent-recorder';
import { FirmaRecorder } from '@/components/firma-recorder';
import { IntelRecorder } from '@/components/intel-recorder';
import { VorstandRecorder } from '@/components/vorstand-recorder';
import { PersonaHistoryRecorder } from '@/components/persona-history-recorder';
import { AkademieRecorder } from '@/components/akademie-recorder';
import { CoinScoreRecorder } from '@/components/coin-score-recorder';
import type { HistoryEntry } from '@/lib/agents/persona-history';
import type { AgentVerdict } from '@/lib/agents/personas';
import type { VorstandReport } from '@/lib/agents/vorstand';
import type { MasterSignalReport } from '@/lib/analysis/master-signal-engine';
import type { BacktestSummary } from '@/lib/analysis/backtest-summary';
import type { EmployeeReport, ChefredakteurReport } from '@/lib/intel/types';
import type { LehrlingReport } from '@/lib/akademie/lehrling';
import type { SpaeherReport } from '@/lib/akademie/spaeher';

interface Props {
  personas: AgentVerdict[];
  masterSignal: MasterSignalReport;
  backtest: BacktestSummary;
  vorstandReport: VorstandReport;
  intelReports: EmployeeReport[];
  intelCeo: ChefredakteurReport;
  lehrlingReport: LehrlingReport;
  spaeherReport: SpaeherReport;
  historyEntries: HistoryEntry[];
  btcPrice: number | null;
  todayIso: string;
  coinScoreCandidates: Array<{ coinId: string; symbol: string; passedCount: number }>;
}

export function HomeLearningRecorders(p: Props) {
  return (
    <>
      <AgentRecorder report={p.masterSignal} backtest={p.backtest} />
      <FirmaRecorder personas={p.personas} generatedAt={p.masterSignal.generatedAt} />
      <IntelRecorder reports={p.intelReports} ceo={p.intelCeo} btcPrice={p.btcPrice} generatedAt={p.masterSignal.generatedAt} />
      <VorstandRecorder report={p.vorstandReport} generatedAt={p.masterSignal.generatedAt} />
      <AkademieRecorder lehrling={p.lehrlingReport} spaeher={p.spaeherReport} />
      <PersonaHistoryRecorder entries={p.historyEntries} />
      <CoinScoreRecorder date={p.todayIso} candidates={p.coinScoreCandidates} />
    </>
  );
}
