'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Coins, Compass, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, Timer, Wallet } from 'lucide-react';
import { evaluateQuickMoneyPlan, MONEY_PLAN_CHANGED_EVENT, MONEY_PLAN_STORAGE_KEY, type MoneyPlan, type MoneyRiskLevel, type QuickMoneyPlanInput } from '@/lib/finance/money-plan';

const PROFILES = [
  { id: 'conservative', icon: ShieldCheck, label: 'Ganz entspannt', description: 'Mehr Ruhe, weniger Schwankung.' },
  { id: 'balanced', icon: Compass, label: 'Die gute Mitte', description: 'Ein ausgewogener Mix.' },
  { id: 'growth', icon: Sparkles, label: 'Mehr Chancen', description: 'Mehr Risiko bewusst tragen.' }
] as const;
const HORIZONS = [{ years: 1, label: 'Bis 1 Jahr', detail: 'Bald wieder verfügbar' }, { years: 3, label: 'Bis 3 Jahre', detail: 'Ein mittleres Ziel' }, { years: 8, label: '8+ Jahre', detail: 'Zeit mitbringen' }];
const euro = (value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const colors = { cash: '#65e6ff', diversified: '#d8ff62', learning: '#bca7ff' };
const icons = { reserve: ShieldCheck, debt: Wallet, horizon: Timer, risk: Compass, allocation: Coins };

export function MoneyPlanTerminal() {
  const [amount, setAmount] = useState('');
  const [horizon, setHorizon] = useState(3);
  const [risk, setRisk] = useState<MoneyRiskLevel>('balanced');
  const [safe, setSafe] = useState(false);
  const [plan, setPlan] = useState<MoneyPlan | null>(null);
  const [storageNote, setStorageNote] = useState('Bleibt auf diesem Gerät.');
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(MONEY_PLAN_STORAGE_KEY);
        if (!raw) { setAmount(''); setHorizon(3); setRisk('balanced'); setSafe(false); setPlan(null); return; }
        const saved: unknown = JSON.parse(raw);
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) { setAmount(''); setHorizon(3); setRisk('balanced'); setSafe(false); setPlan(null); return; }
        const input = saved as QuickMoneyPlanInput;
        setAmount(typeof input.amount === 'number' && Number.isFinite(input.amount) ? String(input.amount) : '');
        setHorizon(HORIZONS.some(h => h.years === input.horizonYears) ? input.horizonYears! : 3);
        setRisk(PROFILES.some(p => p.id === input.riskLevel) ? input.riskLevel! : 'balanced');
        setSafe(input.reserveReady === true && input.debtFree === true);
        const result = evaluateQuickMoneyPlan(input);
        setPlan(result.status !== 'missing' ? result : null);
      } catch { setPlan(null); setSafe(false); setStorageNote('Gespeicherte Angaben konnten nicht gelesen werden. Du kannst deinen Plan neu eingeben.'); }
    };
    sync();
    window.addEventListener(MONEY_PLAN_CHANGED_EVENT, sync);
    return () => window.removeEventListener(MONEY_PLAN_CHANGED_EVENT, sync);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const input: QuickMoneyPlanInput = { amount: amount.trim() === '' ? null : Number(amount), horizonYears: horizon, riskLevel: risk, reserveReady: safe, debtFree: safe };
    const result = evaluateQuickMoneyPlan(input);
    setPlan(result);
    if (result.status !== 'missing') {
      try { window.localStorage.setItem(MONEY_PLAN_STORAGE_KEY, JSON.stringify(input)); window.dispatchEvent(new CustomEvent(MONEY_PLAN_CHANGED_EVENT)); setStorageNote('Dein Plan ist auf diesem Gerät gespeichert.'); }
      catch { setStorageNote('Der Plan funktioniert, konnte aber nicht lokal gespeichert werden.'); }
    }
    window.requestAnimationFrame(() => { resultRef.current?.focus({ preventScroll: true }); resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
  };
  const reset = () => {
    setAmount(''); setHorizon(3); setRisk('balanced'); setSafe(false); setPlan(null);
    try { window.localStorage.removeItem(MONEY_PLAN_STORAGE_KEY); window.dispatchEvent(new CustomEvent(MONEY_PLAN_CHANGED_EVENT)); } catch { /* Inputs remain usable without storage. */ }
    setStorageNote('Bleibt auf diesem Gerät.');
  };
  const changed = () => setPlan(null);

  return <div className="space-y-6">
    <form onSubmit={submit} className="terminal-panel money-plan-form" aria-label="Dein Geldplan">
      <div className="money-form-intro"><span className="section-kicker text-cyan-300">DEIN STARTPUNKT</span><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole size={13} />Privat &amp; lokal</span></div>
      <div className="money-form-body">
        <div>
          <label htmlFor="money-amount" className="money-step-label"><span>01</span>Was möchtest du einplanen?</label>
          <div className="money-amount-wrap"><span aria-hidden>€</span><input id="money-amount" name="amount" type="number" inputMode="decimal" min="1" max="100000000" step="0.01" required placeholder="Dein Betrag" value={amount} onChange={e => { setAmount(e.target.value); changed(); }} aria-describedby="money-amount-help" /></div>
          <p id="money-amount-help" className="mt-2 text-xs leading-relaxed text-slate-400">Geld, das du einmalig für diesen Plan einteilen möchtest.</p>
        </div>
        <fieldset className="mt-8"><legend className="money-step-label"><span>02</span>Wann brauchst du es wieder?</legend><div className="money-horizon-options mt-4 grid grid-cols-3 gap-2">{HORIZONS.map(option => <button type="button" key={option.years} aria-pressed={horizon === option.years} className={`money-choice ${horizon === option.years ? 'selected' : ''}`} onClick={() => { setHorizon(option.years); changed(); }}><span className="flex items-center justify-between gap-2 font-semibold">{option.label}{horizon === option.years && <Check size={15} />}</span><span className="mt-1 block text-xs opacity-70">{option.detail}</span></button>)}</div></fieldset>
        <fieldset className="mt-8"><legend className="money-step-label"><span>03</span>Wie soll es sich anfühlen?</legend><div className="mt-4 grid gap-2 sm:grid-cols-3">{PROFILES.map(profile => <button type="button" key={profile.id} aria-pressed={risk === profile.id} className={`money-choice money-profile ${risk === profile.id ? 'selected' : ''}`} onClick={() => { setRisk(profile.id); changed(); }}><profile.icon size={21} strokeWidth={1.5} className="mb-3" /><span className="block font-semibold">{profile.label}</span><span className="mt-1 block text-xs leading-relaxed opacity-70">{profile.description}</span></button>)}</div></fieldset>
        <label className="money-safety-check"><input type="checkbox" checked={safe} onChange={e => { setSafe(e.target.checked); changed(); }} /><span><strong>Mein Alltag ist abgesichert.</strong><span className="mt-1 block text-xs leading-relaxed text-slate-400">Dieser Betrag ist zusätzlich zu meinem Notgroschen frei – Rechnungen und teure Schulden sind geklärt.</span></span></label>
        <div className="mt-6 flex flex-wrap items-center gap-3"><button type="submit" className="terminal-button terminal-button-primary money-submit">Meinen Plan zeigen<ArrowRight size={18} /></button><button type="button" onClick={reset} className="terminal-button bg-transparent text-slate-400"><RotateCcw size={14} />Neu starten</button></div>
        <p role="status" className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole size={12} />{storageNote}</p>
      </div>
    </form>
    {plan && <section ref={resultRef} tabIndex={-1} aria-label="Dein nächster Schritt" className="terminal-panel money-result-reveal scroll-mt-24">
      <div className={`money-result-header ${plan.status === 'ready' ? 'ready' : ''}`}><div className="money-result-icon">{plan.status === 'ready' ? <Check size={23} /> : <ShieldCheck size={23} />}</div><div><p className="section-kicker">DEIN NÄCHSTER SCHRITT</p><h2 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">{plan.title}</h2></div></div>
      <div className="money-form-body pt-0"><p className="max-w-2xl text-sm leading-relaxed text-slate-300">{plan.nextStep}</p>
        {plan.errors.length > 0 && <ul className="mt-4 space-y-2 text-sm text-amber-200">{plan.errors.map(error => <li key={error}>{error}</li>)}</ul>}
        {plan.allocations.length > 0 && <div className="mt-7"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-200">So könnte dein Plan aussehen</h3><span className="font-mono text-sm text-white">{euro(plan.amount!)}</span></div><div className="flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden>{plan.allocations.map(a => <div key={a.id} style={{ width: `${a.percentage}%`, backgroundColor: colors[a.id] }} className="rounded-full" />)}</div><ul className="mt-4 grid gap-3 md:grid-cols-3">{plan.allocations.map(a => <li key={a.id} className="money-allocation-card"><div className="mb-4 flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[a.id] }} /><span className="font-mono text-xs text-slate-400">{a.percentage} %</span></div><p className="text-xs text-slate-300">{a.label}</p><p className="mt-1 font-display text-2xl font-semibold text-white">{euro(a.amount)}</p><p className="mt-3 text-xs leading-relaxed text-slate-400">{a.explanation}</p></li>)}</ul></div>}
        <details className="mt-7 rounded-xl border border-slate-800"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium text-slate-300"><span className="flex items-center gap-2"><Sparkles size={16} className="text-cyan-300" />Was deine fünf Helfer geprüft haben</span><ChevronDown size={16} /></summary><ul className="space-y-2 border-t border-slate-800 p-4">{plan.agents.map(agent => { const Icon = icons[agent.id]; return <li key={agent.id} className="flex gap-3 rounded-lg bg-slate-950/50 p-3"><Icon size={18} className={`mt-0.5 shrink-0 ${agent.status === 'ready' ? 'text-cyan-300' : 'text-amber-300'}`} /><div><h3 className="text-sm font-semibold text-slate-200">{agent.name}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{agent.finding}</p></div></li>; })}</ul></details>
        <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer py-3 hover:text-slate-300">Annahmen &amp; Grenzen des Plans</summary><ul className="space-y-2 pb-3 leading-relaxed">{plan.assumptions.map(a => <li key={a}>{a}</li>)}</ul></details>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ArrowUpRight size={14} className="mt-0.5 shrink-0" />Du entscheidest selbst. Deine Helfer rechnen nach transparenten Regeln; sie kennen nicht deine gesamte finanzielle Situation und führen keine Käufe aus.</p>
      </div>
    </section>}
  </div>;
}
