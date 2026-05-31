'use client';

import { useState } from 'react';
import { addPosition } from '@/lib/positions';

interface Props {
  ticker: string;
  underlying: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  brokers: string[];
}

function inferBroker(brokers: string[]): 'Coinbase' | 'Scalable' | 'Trade Republic' | 'Bitpanda' | 'Unknown' {
  if (brokers.includes('Coinbase')) return 'Coinbase';
  if (brokers.includes('Scalable Capital') || brokers.includes('Scalable')) return 'Scalable';
  if (brokers.includes('Bitpanda')) return 'Bitpanda';
  if (brokers.includes('Trade Republic')) return 'Trade Republic';
  return 'Unknown';
}

// Pre-fills a new position from a recommended setup. Adds it as 'open' to
// the local positions store, no real-money execution.
export function QuickPositionButton({ ticker, underlying, entry, stopLoss, takeProfit, brokers }: Props) {
  const [created, setCreated] = useState(false);
  const broker = inferBroker(brokers);

  const handleClick = () => {
    if (created) return;
    const confirmed = window.confirm(
      `Position für ${ticker} im lokalen Tagebuch anlegen?\n\n` +
      `Einstieg: $${entry}\nStop: $${stopLoss}\nZiel: $${takeProfit}\nBroker: ${broker}\n\n` +
      `Achtung: das ist nur ein Tagebuch-Eintrag, KEIN echter Trade.`
    );
    if (!confirmed) return;
    addPosition({
      underlying,
      ticker,
      instrumentType: 'crypto',
      broker,
      entryPrice: entry,
      positionSize: 0,
      investmentQuote: 0,
      currency: 'USD',
      stopLossPlanned: stopLoss,
      takeProfitPlanned: takeProfit,
      thesis: `Setup aus App-Empfehlung: Einstieg $${entry}, Stop $${stopLoss}, Ziel $${takeProfit}.`,
      notes: ''
    });
    setCreated(true);
    setTimeout(() => setCreated(false), 3000);
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
      title="Setup als Position im lokalen Tagebuch festhalten (kein realer Trade)"
    >
      {created ? '✓ Position im Tagebuch' : '+ Position erfassen'}
    </button>
  );
}
