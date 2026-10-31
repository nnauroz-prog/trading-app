'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { WORLD_EQUITY_FUND } from '@/lib/finance/investment-product';
import { ArrowRight, Check, ChevronDown, Compass, LockKeyhole, Pencil, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { evaluateQuickMoneyPlan, type MoneyPlan, type MoneyRiskLevel } from '@/lib/finance/money-plan';
import { clearMoneyPlan, saveMoneyPlan, useSavedMoneyPlan } from '@/components/finance/use-saved-money-plan';

const PROFILES = [
  { id: 'conservative', icon: ShieldCheck, label: 'Wenig Risiko', description: 'Mehr Geld auf dem Konto lassen.' },
  { id: 'balanced', icon: Compass, label: 'Eine Mischung', description: 'Konto und Anlagen mischen.' },
  { id: 'growth', icon: Sparkles, label: 'Mehr Risiko', description: 'Größere Wertschwankungen sind für mich okay.' }
] as const;
const HORIZONS = [{ years: 1, label: 'Bis 1 Jahr' }, { years: 3, label: 'Bis 3 Jahre' }, { years: 5, label: 'Etwa 5 Jahre' }, { years: 8, label: '8 Jahre oder mehr' }];
const euro = (value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const colors = { cash: '#65e6ff', diversified: '#d8ff62', learning: '#bca7ff' };

export function MoneyPlanTerminal() {
  const saved = useSavedMoneyPlan();
  const [amount, setAmount] = useState('');
  const [horizon, setHorizon] = useState(3);
  const [risk, setRisk] = useState<MoneyRiskLevel>('balanced');
  const [safe, setSafe] = useState(false);
  const [plan, setPlan] = useState<MoneyPlan | null>(null);
  const [note, setNote] = useState('Deine Angaben bleiben in diesem Browser.');
  const amountRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!saved.loaded) return;
    setAmount(saved.input?.amount != null ? String(saved.input.amount) : '');
    setHorizon(saved.input?.horizonYears ?? 3);
    setRisk(saved.input?.riskLevel ?? 'balanced');
    setSafe(saved.input?.reserveReady === true && saved.input?.debtFree === true);
    setPlan(saved.plan);
  }, [saved.input, saved.plan, saved.loaded]);
  const moveToResult = () => window.requestAnimationFrame(() => { resultRef.current?.focus({ preventScroll: true }); resultRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const input = { amount: amount.trim() ? Number(amount) : null, horizonYears: horizon, riskLevel: risk, reserveReady: safe, debtFree: safe };
    const result = evaluateQuickMoneyPlan(input);
    setPlan(result);
    if (result.status !== 'missing') setNote(saveMoneyPlan(input) ? 'Dein Plan ist in diesem Browser gespeichert.' : 'Du kannst den Plan ansehen. Speichern war in diesem Browser nicht möglich.');
    moveToResult();
  };
  const edit = () => { setPlan(null); window.requestAnimationFrame(() => { amountRef.current?.focus(); amountRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); };
  const reset = () => { clearMoneyPlan(); setAmount(''); setHorizon(3); setRisk('balanced'); setSafe(false); setPlan(null); };
  const horizonOptions = HORIZONS.some(option => option.years === horizon) ? HORIZONS : [...HORIZONS, { years: horizon, label: `${horizon.toLocaleString('de-DE')} Jahre` }].sort((a,b) => a.years-b.years);

  return <div className="space-y-6">
    {plan && plan.status !== 'missing' ? <section id="dein-plan" ref={resultRef} tabIndex={-1} aria-label="Dein nächster Schritt" className="terminal-panel money-result-reveal scroll-mt-24">
      <div className={`money-result-header ${plan.status === 'ready' ? 'ready' : ''}`}><div className="money-result-icon">{plan.status === 'ready' ? <Check size={23} /> : <ShieldCheck size={23} />}</div><div><p className="text-xs text-slate-400">Dein Geldplan</p><h2 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">{plan.title}</h2></div></div>
      <div className="money-form-body pt-0"><p className="max-w-2xl text-sm leading-relaxed text-slate-300">{plan.nextStep}</p>
        {plan.allocations.length > 0 && <div className="mt-7"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-200">Eine mögliche Aufteilung</h3><span className="font-mono text-sm text-white">{euro(plan.amount!)}</span></div><div className="flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden>{plan.allocations.map(a => <div key={a.id} style={{ width: `${a.percentage}%`, backgroundColor: colors[a.id] }} className="rounded-full" />)}</div><ul className={`mt-4 grid gap-3 ${plan.allocations.length === 2 ? 'md:grid-cols-2' : plan.allocations.length > 2 ? 'md:grid-cols-3' : ''}`}>{plan.allocations.map(a => <li key={a.id} className="money-allocation-card"><div className="mb-4 flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[a.id] }} /><span className="font-mono text-xs text-slate-400">{a.percentage} %</span></div><h3 className="text-sm font-medium text-slate-200">{a.label}</h3><p className="mt-1 font-display text-2xl font-semibold text-white">{euro(a.amount)}</p><p className="mt-3 text-sm leading-relaxed text-slate-400">{a.explanation}</p>{a.id === 'diversified' && <Link href="/geldplan/analyse" className="terminal-button terminal-button-primary mt-4 w-full justify-between">Fonds &amp; Kaufanalyse<ArrowRight size={16} /></Link>}{a.id === 'learning' && <Link href="/krypto" className="terminal-button mt-4 w-full justify-between">Krypto-Kaufprüfung<ArrowRight size={16} /></Link>}{a.id === 'cash' && <details className="mt-4 border-t border-slate-800 pt-2"><summary className="cursor-pointer text-sm text-cyan-200">Wie aufbewahren?</summary><p className="mt-2 text-sm leading-relaxed text-slate-400">Zum Beispiel auf einem getrennten Tagesgeldkonto, auf das du bei Bedarf zugreifen kannst. Prüfe Zinsen, Gebühren und die Absicherung der Bank. Dieses Geld ist kein zusätzliches Kaufbudget.</p></details>}</li>)}</ul></div>}
        <div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={edit} className="terminal-button terminal-button-primary"><Pencil size={15} />Angaben ändern</button><button type="button" onClick={reset} className="terminal-button bg-transparent text-slate-400"><RotateCcw size={14} />Plan löschen</button></div>
        {plan.status === 'ready' && <details className="mt-5 rounded-xl border border-slate-800"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm text-slate-300">Warum diese Aufteilung?<ChevronDown size={15} /></summary><div className="space-y-3 border-t border-slate-800 p-4 text-sm leading-relaxed text-slate-400"><p>{horizon < WORLD_EQUITY_FUND.minimumYears ? 'Du brauchst dein Geld bald wieder. Deshalb bleibt es auf einem Konto verfügbar.' : `Du möchtest dein Geld für ${horizon.toLocaleString('de-DE')} Jahre einplanen. Deshalb kann ein Teil länger angelegt bleiben.`}</p>{horizon >= WORLD_EQUITY_FUND.minimumYears && <p>{risk === 'conservative' ? 'Du möchtest wenig Risiko. Deshalb bleibt ein größerer Teil auf dem Konto.' : risk === 'balanced' ? 'Du möchtest eine Mischung. Deshalb verteilt sich das Geld auf Konto und Anlagen.' : 'Du hast mehr Risiko gewählt. Deshalb ist der Anteil für Anlagen größer.'}</p>}<p>Wir rechnen mit deinem frei verfügbaren Betrag. Dein übriges Vermögen, laufende Einnahmen und Ausgaben sind nicht berücksichtigt. Gewinne sind nicht garantiert.</p></div></details>}
        <p role="status" className="mt-5 flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole size={12} />{note}</p>
      </div>
    </section> : <form onSubmit={submit} className="terminal-panel money-plan-form" aria-label="Dein Geldplan">
      <div className="money-form-body">
        <div><label htmlFor="money-amount" className="money-step-label">Wie viel Geld möchtest du verteilen?</label><div className="money-amount-wrap"><span aria-hidden>€</span><input ref={amountRef} id="money-amount" name="amount" type="number" inputMode="decimal" min="1" max="100000000" step="0.01" required placeholder="Dein Betrag" value={amount} onChange={e => setAmount(e.target.value)} aria-describedby="money-amount-help" /></div><p id="money-amount-help" className="mt-2 text-sm leading-relaxed text-slate-400">Ein Betrag, den du jetzt zur Verfügung hast.</p></div>
        <fieldset className="mt-7"><legend className="money-step-label">Wann brauchst du das Geld wieder?</legend><div className="money-horizon-options mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{horizonOptions.map(option => <button type="button" key={option.years} aria-pressed={horizon === option.years} className={`money-choice ${horizon === option.years ? 'selected' : ''}`} onClick={() => setHorizon(option.years)}><span className="flex items-center justify-between gap-2 font-semibold">{option.label}{horizon === option.years && <Check size={15} />}</span></button>)}</div></fieldset>
        {horizon >= WORLD_EQUITY_FUND.minimumYears && <fieldset className="mt-7"><legend className="money-step-label">Wie viel Risiko möchtest du eingehen?</legend><div className="mt-4 grid gap-2 sm:grid-cols-3">{PROFILES.map(profile => <button type="button" key={profile.id} aria-pressed={risk === profile.id} className={`money-choice money-profile ${risk === profile.id ? 'selected' : ''}`} onClick={() => setRisk(profile.id)}><profile.icon size={21} strokeWidth={1.5} className="mb-3" /><span className="block font-semibold">{profile.label}</span><span className="mt-1 block text-sm leading-relaxed opacity-80">{profile.description}</span></button>)}</div></fieldset>}
        <label className="money-safety-check"><input type="checkbox" checked={safe} onChange={e => setSafe(e.target.checked)} /><span><strong>Dieses Geld ist wirklich frei.</strong><span className="mt-1 block text-sm leading-relaxed text-slate-400">Meine Rechnungen sind bezahlt. Für Notfälle habe ich extra Geld. Teure Schulden habe ich geklärt.</span></span></label>
        <button type="submit" className="terminal-button terminal-button-primary money-submit mt-6">Aufteilung ansehen<ArrowRight size={18} /></button>
        {plan?.status === 'missing' && <p role="alert" className="mt-4 text-sm text-amber-200">{plan.errors[0]}</p>}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole size={12} />Deine Angaben bleiben in diesem Browser.</p>
      </div>
    </form>}
  </div>;
}
