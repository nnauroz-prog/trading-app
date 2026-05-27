'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IdeaValidation, ParsedTelegramIdea, UserRiskProfile, DerivativeAnalysis, ParsedInstrument, SignalDecision } from '@/lib/types/ideas';
import { parseTelegramIdea } from '@/lib/telegram/parse-telegram-idea';
import { validateIdea } from '@/lib/validation/validate-idea';
import { DEFAULT_PROFILE, PROFILE_CHANGED_EVENT, loadUserProfile, profileLabel, saveUserProfile } from '@/lib/user-profile';
import { checkInstrumentAvailability } from '@/lib/data/brokers/manual-instrument-allowlist';
import { addJournalEntry } from '@/lib/journal';
import { buildPrefillFromIdea, savePrefill } from '@/lib/position-prefill';

const SAMPLE_BMW = `Tradingidee BMW-OS

BMW behauptet sich in der Branchenkrise besser als die deutsche Konkurrenz. Entwicklungskosten sinken, Margen sollen geschützt werden. iX3 und Neue Klasse als Wachstumstreiber. Mögliche Entspannung bei Lieferketten und Energiepreisen.

75€ aktueller Kurs
71€ 52-Wochentief
98€ 52-Wochenhoch

Trade Republic
Sehr hohes Risiko: SY0N7Q 100€ Dez 2027
Hohes Risiko: FD1D9P 84€ Dez 2027
Mittleres Risiko: FE5RNN 70€ Dez 2027
Niedriges Risiko: HT0N3G 60€ Dez 2028
Niedrigstes Risiko: 519000 Aktie kaufen

Scalable
Sehr hohes Risiko: UN2W57 100€ Dez 2027
Hohes Risiko: HT0N3C 84€ Dez 2027
Mittleres Risiko: HS9BMN 70€ Dez 2027
Niedriges Risiko: HT0N3G 60€ Dez 2028
Niedrigstes Risiko: 519000 Aktie kaufen`;

function decisionStyle(decision: SignalDecision): { bg: string; border: string; text: string; bigText: string } {
  switch (decision) {
    case 'BUY_STRONG':
      return { bg: 'bg-emerald-500/15', border: 'border-emerald-400/60', text: 'text-emerald-200', bigText: 'text-emerald-100' };
    case 'BUY_CAUTIOUS':
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-300', bigText: 'text-emerald-200' };
    case 'WATCH':
      return { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-300', bigText: 'text-amber-200' };
    case 'NO_TRADE':
    case 'AVOID':
      return { bg: 'bg-rose-500/10', border: 'border-rose-500/40', text: 'text-rose-300', bigText: 'text-rose-200' };
    case 'SELL_OR_REDUCE':
      return { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-300', bigText: 'text-orange-200' };
  }
}

function riskColor(risk: string): string {
  switch (risk) {
    case 'Sehr hohes Risiko': return 'text-rose-300';
    case 'Hohes Risiko': return 'text-orange-300';
    case 'Mittleres Risiko': return 'text-amber-300';
    case 'Niedriges Risiko': return 'text-emerald-300';
    case 'Niedrigstes Risiko': return 'text-emerald-200';
    default: return 'text-slate-400';
  }
}

function ProfileBar({ profile, onChange }: { profile: UserRiskProfile; onChange: (p: UserRiskProfile) => void }) {
  const options: UserRiskProfile[] = ['beginner', 'intermediate', 'speculative', 'very_speculative'];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">Risiko-Profil</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
            profile === o
              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
              : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
        >
          {profileLabel(o)}
        </button>
      ))}
    </div>
  );
}

function ParsedSummary({ parsed }: { parsed: ParsedTelegramIdea }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Erkannter Inhalt</h3>
      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Titel</dt>
          <dd className="mt-0.5 font-semibold text-slate-100">{parsed.title}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Basiswert</dt>
          <dd className="mt-0.5 font-semibold text-slate-100">{parsed.underlying} <span className="text-slate-500">({parsed.underlyingType})</span></dd>
        </div>
        <div>
          <dt className="text-slate-500">Idee-Typ</dt>
          <dd className="mt-0.5 font-semibold text-slate-100">{parsed.ideaType}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Aktueller Kurs</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-100">{parsed.currentPriceMentioned !== null ? `${parsed.currentPriceMentioned} €` : '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">52W Tief / Hoch</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-100">{parsed.week52Low ?? '—'} / {parsed.week52High ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Broker</dt>
          <dd className="mt-0.5 font-semibold text-slate-100">{parsed.brokers.length > 0 ? parsed.brokers.join(', ') : '—'}</dd>
        </div>
      </dl>
      {parsed.thesis.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">These</div>
          <ul className="space-y-1">
            {parsed.thesis.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InstrumentComparisonTable({
  instruments,
  derivativeAnalysis,
  bestForProfile
}: {
  instruments: ParsedInstrument[];
  derivativeAnalysis: DerivativeAnalysis[];
  bestForProfile: ParsedInstrument | null;
}) {
  if (instruments.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Produktvergleich</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2">Broker</th>
              <th className="px-2 py-2">WKN/Ticker</th>
              <th className="px-2 py-2">Typ</th>
              <th className="px-2 py-2">Strike / Laufzeit</th>
              <th className="px-2 py-2">Risiko Tg</th>
              <th className="px-2 py-2">Risiko App</th>
              <th className="px-2 py-2">Verfügbar</th>
              <th className="px-2 py-2">Kommentar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {instruments.map((inst, i) => {
              const id = inst.wkn ?? inst.ticker ?? inst.isin ?? '';
              const ava = checkInstrumentAvailability(inst.broker, id);
              const matchingAnalysis = derivativeAnalysis.find((d) => d.instrument === inst);
              const isBest = bestForProfile === inst;
              return (
                <tr key={i} className={isBest ? 'bg-emerald-500/5' : ''}>
                  <td className="px-2 py-2 text-slate-300">{inst.broker}</td>
                  <td className="px-2 py-2 font-mono text-slate-100">{id || '—'}</td>
                  <td className="px-2 py-2 text-slate-400">{inst.instrumentType}</td>
                  <td className="px-2 py-2 font-mono text-slate-300">
                    {inst.strike ? `${inst.strike}€` : '—'}{inst.expiry ? ` · ${inst.expiry}` : ''}
                  </td>
                  <td className={`px-2 py-2 ${riskColor(inst.riskLevelFromSource ?? '')}`}>
                    {inst.riskLevelFromSource ?? '—'}
                  </td>
                  <td className={`px-2 py-2 ${matchingAnalysis ? riskColor(matchingAnalysis.riskClass) : 'text-slate-400'}`}>
                    {matchingAnalysis?.riskClass ?? (inst.instrumentType === 'stock' ? 'Niedrigstes Risiko' : '—')}
                  </td>
                  <td className="px-2 py-2">
                    {ava.verified ? (
                      <span className="text-emerald-300">✓ verified</span>
                    ) : (
                      <span className="text-slate-500">nicht geprüft</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-slate-400">
                    {isBest ? <span className="font-semibold text-emerald-300">→ Empfehlung für Profil</span> : matchingAnalysis?.recommendation.slice(0, 60) ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-slate-600">
        {`„Risiko Tg" = Risikostufe wie im Text genannt. „Risiko App" = unabhängige Bewertung (Strike-Abstand + Restlaufzeit + Hebelwirkung).`}
        Verfügbarkeit aus manuell gepflegter Allowlist — vor Kauf im Broker selbst nochmal verifizieren.
      </p>
    </div>
  );
}

function ScoreBars({ validation }: { validation: IdeaValidation }) {
  const bars: Array<{ label: string; value: number; max: number }> = [
    { label: 'Thesis', value: validation.scoreBreakdown.thesisScore, max: 20 },
    { label: 'Technical', value: validation.scoreBreakdown.technicalScore, max: 20 },
    { label: 'Risk/Reward', value: validation.scoreBreakdown.riskRewardScore, max: 15 },
    { label: 'Instrument', value: validation.scoreBreakdown.instrumentQualityScore, max: 15 },
    { label: 'Market', value: validation.scoreBreakdown.marketContextScore, max: 10 },
    { label: 'Broker', value: validation.scoreBreakdown.brokerAvailabilityScore, max: 5 },
    { label: 'Source', value: validation.scoreBreakdown.sourceQualityScore, max: 5 },
    { label: 'User-Fit', value: validation.scoreBreakdown.userFitScore, max: 10 }
  ];
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Score-Bausteine</h3>
        <span className="font-mono text-2xl font-bold text-emerald-300">{validation.totalScore}<span className="text-slate-600">/100</span></span>
      </div>
      <div className="space-y-2">
        {bars.map((b) => {
          const pct = (b.value / b.max) * 100;
          const color = pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
          return (
            <div key={b.label}>
              <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
                <span className="text-slate-400">{b.label}</span>
                <span className="font-mono text-slate-300">{b.value}/{b.max}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IdeaInbox() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTelegramIdea | null>(null);
  const [validation, setValidation] = useState<IdeaValidation | null>(null);
  const [profile, setProfile] = useState<UserRiskProfile>(DEFAULT_PROFILE);
  const [mounted, setMounted] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => setProfile(loadUserProfile());
    refresh();
    setMounted(true);
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
  }, []);

  const handleSaveJournal = useCallback(() => {
    if (!parsed || !validation) return;
    addJournalEntry(parsed, validation, profile, 'idea_analysis');
    setJournalSaved(true);
    window.setTimeout(() => setJournalSaved(false), 2500);
  }, [parsed, validation, profile]);

  const handleCreatePosition = useCallback(() => {
    if (!parsed || !validation) return;
    const prefill = buildPrefillFromIdea(parsed, validation.bestInstrumentForProfile);
    savePrefill(prefill);
    router.push('/positions?prefill=1');
  }, [parsed, validation, router]);

  const handleAnalyze = useCallback(() => {
    if (!text.trim()) return;
    const p = parseTelegramIdea(text);
    const v = validateIdea(p, profile);
    setParsed(p);
    setValidation(v);
  }, [text, profile]);

  const handleProfileChange = useCallback((p: UserRiskProfile) => {
    saveUserProfile(p);
    setProfile(p);
    if (parsed) {
      setValidation(validateIdea(parsed, p));
    }
  }, [parsed]);

  if (!mounted) return null;

  const styles = validation ? decisionStyle(validation.decision) : null;

  return (
    <div className="space-y-4">
      <ProfileBar profile={profile} onChange={handleProfileChange} />

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trading-Idee einfügen</h2>
          <button
            onClick={() => setText(SAMPLE_BMW)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            BMW-Beispiel laden
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Text aus beliebiger Quelle einfügen (Chat, Forum, Newsletter, Screenshot-Transkript). Die App parst Basiswert, Instrumente, Risikostufen und Broker — und prüft die Idee unabhängig gegen eigene Logik.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Trading-Idee hier einfügen…"
          className="min-h-[180px] w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Idee analysieren →
          </button>
          <button
            onClick={() => {
              setText('');
              setParsed(null);
              setValidation(null);
            }}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      {validation && parsed && styles && (
        <section className={`overflow-hidden rounded-2xl border-2 ${styles.border} ${styles.bg} p-5`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">App-Bewertung</div>
          <h2 className={`mt-1 text-2xl font-bold tracking-tight ${styles.bigText} sm:text-3xl`}>{validation.decisionLabel}</h2>
          <div className="mt-1 text-xs text-slate-500">
            Score {validation.totalScore}/100 · Profil: {profileLabel(profile)} · {new Date(validation.generatedAt).toLocaleString('de-DE')}
          </div>
          {validation.reasoning.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {validation.reasoning.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${styles.text}`} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300">Warnungen</div>
              <ul className="space-y-1 text-rose-200/90">
                {validation.warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
          {validation.unverifiedFlags.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Nicht verifiziert</div>
              <ul className="space-y-1 text-amber-200/80">
                {validation.unverifiedFlags.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-500">{validation.marketContextNote}</p>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <button
              onClick={handleSaveJournal}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                journalSaved
                  ? 'border-emerald-400/60 bg-emerald-500/30 text-emerald-100'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              {journalSaved ? '✓ Im Journal gespeichert' : 'Im Journal speichern'}
            </button>
            <button
              onClick={handleCreatePosition}
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20"
            >
              Position erstellen →
            </button>
          </div>
        </section>
      )}

      {parsed && <ParsedSummary parsed={parsed} />}

      {parsed && validation && (
        <InstrumentComparisonTable
          instruments={parsed.instruments}
          derivativeAnalysis={validation.derivativeAnalysis}
          bestForProfile={validation.bestInstrumentForProfile}
        />
      )}

      {validation && <ScoreBars validation={validation} />}
    </div>
  );
}
