import { Broker } from '@/lib/types/ideas';

const BROKER_PATTERNS: Array<{ broker: Broker; pattern: RegExp }> = [
  { broker: 'Trade Republic', pattern: /\btrade[\s-]?republic\b/i },
  { broker: 'Scalable', pattern: /\bscalable(?:\s+capital)?\b/i },
  { broker: 'Coinbase', pattern: /\bcoinbase\b/i },
  { broker: 'Bitpanda', pattern: /\bbitpanda\b/i }
];

export function extractBrokers(text: string): Broker[] {
  const out: Broker[] = [];
  for (const { broker, pattern } of BROKER_PATTERNS) {
    if (pattern.test(text)) out.push(broker);
  }
  return out;
}

export interface BrokerSection {
  broker: Broker;
  startIdx: number;
  endIdx: number;
  text: string;
}

export function splitByBrokerSections(text: string): BrokerSection[] {
  const lines = text.split(/\n/);
  const sections: BrokerSection[] = [];
  let currentBroker: Broker | null = null;
  let buffer: string[] = [];
  let startIdx = 0;
  let cursor = 0;

  const flush = (endIdx: number) => {
    if (currentBroker !== null && buffer.length > 0) {
      sections.push({
        broker: currentBroker,
        startIdx,
        endIdx,
        text: buffer.join('\n')
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const lineLength = line.length + 1;
    let matchedBroker: Broker | null = null;
    for (const { broker, pattern } of BROKER_PATTERNS) {
      if (pattern.test(line) && line.trim().length < 40) {
        matchedBroker = broker;
        break;
      }
    }
    if (matchedBroker) {
      flush(cursor);
      currentBroker = matchedBroker;
      startIdx = cursor + lineLength;
    } else if (currentBroker) {
      buffer.push(line);
    }
    cursor += lineLength;
  }
  flush(cursor);
  return sections;
}
