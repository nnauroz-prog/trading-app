import { RiskLevel } from '@/lib/types/ideas';

const RISK_PATTERNS: Array<{ level: RiskLevel; pattern: RegExp }> = [
  { level: 'Sehr hohes Risiko', pattern: /sehr\s*hohes?\s*risiko/i },
  { level: 'Hohes Risiko', pattern: /hohes?\s*risiko/i },
  { level: 'Mittleres Risiko', pattern: /mittler(?:es|e)\s*risiko/i },
  { level: 'Niedrigstes Risiko', pattern: /niedrigstes?\s*risiko/i },
  { level: 'Niedriges Risiko', pattern: /niedrig(?:es|e)?\s*risiko/i }
];

export function extractRiskLevel(line: string): RiskLevel | undefined {
  if (/sehr\s*hohes?\s*risiko/i.test(line)) return 'Sehr hohes Risiko';
  if (/niedrigstes?\s*risiko/i.test(line)) return 'Niedrigstes Risiko';
  if (/hohes?\s*risiko/i.test(line)) return 'Hohes Risiko';
  if (/mittler(?:es|e)\s*risiko/i.test(line)) return 'Mittleres Risiko';
  if (/niedrig(?:es|e)?\s*risiko/i.test(line)) return 'Niedriges Risiko';
  return undefined;
}

export function riskLevelToScore(level: RiskLevel): number {
  switch (level) {
    case 'Sehr hohes Risiko': return 5;
    case 'Hohes Risiko': return 4;
    case 'Mittleres Risiko': return 3;
    case 'Niedriges Risiko': return 2;
    case 'Niedrigstes Risiko': return 1;
    default: return 3;
  }
}

export const ALL_RISK_PATTERNS = RISK_PATTERNS;
