import { ChefredakteurReport, EmployeeReport, IntelSignal } from '@/lib/intel/types';

// The CEO listens to all twelve employees and produces a one-paragraph
// situation report. Counts directional signals, flags conflicts where two
// departments disagree, and picks 2–3 highlights to lead with.
export function chefredakteurSynthesis(reports: EmployeeReport[]): ChefredakteurReport {
  const active = reports.filter((r) => r.signal !== 'kein_signal' && r.confidence !== 'keine_daten');
  const riskOn = active.filter((r) => r.signal === 'risk-on');
  const riskOff = active.filter((r) => r.signal === 'risk-off');
  const neutral = active.filter((r) => r.signal === 'neutral');

  let netSignal: IntelSignal = 'neutral';
  if (riskOn.length >= riskOff.length + 2) netSignal = 'risk-on';
  else if (riskOff.length >= riskOn.length + 2) netSignal = 'risk-off';

  // Highlights: prefer "sicher" + non-neutral findings, then "sicher" neutral
  // findings, dann der Rest.
  const ranked = [...active].sort((a, b) => {
    const score = (r: EmployeeReport) => {
      let s = 0;
      if (r.confidence === 'sicher') s += 3;
      else if (r.confidence === 'wahrscheinlich') s += 2;
      else if (r.confidence === 'vermutung') s += 1;
      if (r.signal !== 'neutral') s += 2;
      return s;
    };
    return score(b) - score(a);
  });
  const highlights = ranked.slice(0, 3).map((r) => `${r.title}: ${r.finding}`);

  // Conflicts: any pair (risk-on, risk-off) within the same department, plus
  // cross-department, both contribute. Reported as short lines.
  const conflicts: string[] = [];
  for (const on of riskOn) {
    for (const off of riskOff) {
      conflicts.push(`${on.title} (risk-on) gegen ${off.title} (risk-off)`);
    }
  }

  let lagebericht: string;
  if (active.length === 0) {
    lagebericht = 'Die Redaktion sitzt heute auf trockenen Datenquellen — alle Mitarbeiter melden keine_daten. Das ist selten, aber kommt vor: API-Pause, Wartung beim Provider, oder schlicht Netzwerk-Wackler. Bitte später nochmal nachschauen.';
  } else if (netSignal === 'risk-on') {
    lagebericht = `${riskOn.length} von ${active.length} Spezialisten sehen risk-on, nur ${riskOff.length} risk-off, ${neutral.length} neutral. Tendenz Richtung Kauf-Bereitschaft. ${conflicts.length > 0 ? `Aber Achtung: ${conflicts[0]}.` : 'Keine harten Widersprüche im Team.'}`;
  } else if (netSignal === 'risk-off') {
    lagebericht = `${riskOff.length} von ${active.length} Spezialisten sehen risk-off, nur ${riskOn.length} risk-on, ${neutral.length} neutral. Tendenz zur Vorsicht. ${conflicts.length > 0 ? `Auffälliger Widerspruch: ${conflicts[0]}.` : 'Das Team ist sich relativ einig.'}`;
  } else {
    lagebericht = `Das Team ist heute gespalten: ${riskOn.length} risk-on, ${riskOff.length} risk-off, ${neutral.length} neutral. Kein klares Lager hat die Mehrheit. ${conflicts.length > 0 ? `Beispiel: ${conflicts[0]}.` : ''}`.trim();
  }

  return {
    lagebericht,
    netSignal,
    riskOnCount: riskOn.length,
    riskOffCount: riskOff.length,
    conflicts,
    highlights
  };
}
