import { AgentVerdict } from '@/lib/agents/personas';
import { CEO_BIOS } from '@/lib/agents/personalities';

export interface DailyNote {
  firma: AgentVerdict['persona'];
  firmaName: string;
  ceoName: string;
  title: string;
  body: string;
}

// Composes a short narrative day-note in the CEO's voice. Length and tone vary
// by firma. Used for the /agent page to feel less like a dashboard and more
// like a daily-blog from three trading partners.
export function composeDailyNote(verdict: AgentVerdict): DailyNote {
  const ceo = CEO_BIOS[verdict.persona];
  const target = verdict.target;
  const lines: string[] = [];
  let title: string;

  if (verdict.persona === 'conservative') {
    if (verdict.verdict === 'BUY' && target) {
      title = `Heute kaufe ich ${target.symbol} — sehr selten`;
      lines.push(
        `Es kommt nicht oft vor, dass ich grünes Licht gebe. Heute aber: ${target.symbol} hat alle ${verdict.safety?.totalHard ?? 0} harten Sicherheits-Kriterien erfüllt, das Setup-Team meldet einstimmig STARK, und der Backtest-Auditor sagt: vergleichbare Setups gingen historisch sauber auf.`,
        `Ich gehe mit ${verdict.persona === 'conservative' ? '1%' : '2%'} Account-Risk rein, Stop bei $${target.stopLoss}, erstes Ziel bei $${target.takeProfit1}. Bei 50% verkaufe ich das halbe Lager und ziehe den Stop auf Einstand — danach ist der Trade kostenlos.`,
        `Sollte das Setup unter den Stop fallen, ist es ungültig. Keine Diskussion, kein Nachkaufen.`
      );
    } else {
      title = `Heute wieder warten`;
      lines.push(
        `Drei Sub-Agenten haben mir berichtet — keiner sieht ein Setup, das meinen Kriterien standhält. ${verdict.rationale}`,
        `Cash zu halten fühlt sich langweilig an, aber jeder Tag, an dem ich nicht falsch handle, ist ein guter Tag. Vermögenserhalt geht vor Vermögensaufbau.`
      );
    }
  } else if (verdict.persona === 'balanced') {
    if (verdict.verdict === 'BUY' && target) {
      title = `${target.symbol} — solide Konfluenz, ich nehme den Trade`;
      lines.push(
        `${target.passedCount}/12 Häkchen, Risiko-Manager grünes Licht, Markt nicht im Abverkauf — das reicht mir. ${target.symbol} bekommt heute eine Position.`,
        `Stop bei $${target.stopLoss}, Ziel 1 bei $${target.takeProfit1}, Ziel 2 bei $${target.takeProfit2}. Bei Ziel 1 nehme ich 70% raus, der Rest läuft auf Ziel 2 mit Stop auf Einstand.`,
        `Position-Größe nach Kelly-halbiert: 2% Account-Risk. Wer das mit 1% rechnet, schläft ruhiger.`
      );
    } else {
      title = `Heute noch nicht reif`;
      lines.push(
        `${verdict.rationale} Nicht jedes Setup, das halb gut aussieht, ist tradeable.`,
        `Wir bleiben in der Spur: bestätigte Konfluenz, klarer Stop, gesunde R/R. Eines dieser drei fehlt — also warten.`
      );
    }
  } else {
    // aggressive
    if (verdict.verdict === 'BUY' && target) {
      title = `${target.symbol} — schnell rein, schnell raus`;
      lines.push(
        `Setup ist da, Markt läuft, Risiko-Manager hat nichts gegen mich. Ich greife zu, aber mit der Disziplin eines Profis: kleine Position, harter Stop, klares Ziel.`,
        `Einstieg ${target.entry >= 1 ? '$' + target.entry.toFixed(2) : '$' + target.entry.toFixed(4)}. Stop ${target.stopLoss >= 1 ? '$' + target.stopLoss.toFixed(2) : '$' + target.stopLoss.toFixed(4)}, das sind ${target.stopDistancePct.toFixed(1)}% Risiko. Ziel ${target.takeProfit1 >= 1 ? '$' + target.takeProfit1.toFixed(2) : '$' + target.takeProfit1.toFixed(4)}, R/R ${target.rrTp1.toFixed(1)}:1.`,
        `Bei Ziel 1 nehme ich die volle Position raus. Kein Halten für Ziel 2 — Gier ist mein einziger echter Feind.`
      );
    } else {
      title = `Sogar mir zu heiß`;
      lines.push(
        `Wenn ich nicht handeln will, dann liegt es nicht an Vorsicht — sondern daran, dass selbst meine Schmerzgrenze überschritten ist.`,
        `${verdict.rationale} Morgen sieht alles anders aus.`
      );
    }
  }

  return {
    firma: verdict.persona,
    firmaName: verdict.name,
    ceoName: ceo.name,
    title,
    body: lines.join('\n\n')
  };
}
