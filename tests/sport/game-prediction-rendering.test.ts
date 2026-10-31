import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GamePredictionDetails } from '@/components/sport/game-prediction';
import type { GamePrediction } from '@/lib/sport/game-prediction';

const fixture = (): GamePrediction => ({
  sport: 'football',
  id: 'soccer/ger.1:123',
  home: 'Heimteam',
  away: 'Auswärtsteam',
  state: 'pre',
  kind: 'forecast',
  fetchedAt: '2026-10-31T12:00:00.000Z',
  sourceUpdatedAt: null,
  sourceScore: { home: null, away: null },
  score: { available: true, home: 2, away: 1, probability: 0.13, label: 'Mögliches Endergebnis (90 Minuten)' },
  winner: { available: true, side: 'home', name: 'Heimteam', probability: 0.58, probabilities: { home: 0.58, draw: 0.22, away: 0.2 } },
  goalscorers: { available: true, players: [{ name: 'Testspieler', team: 'Heimteam', seasonGoals: 2, appearances: 4, lineupStatus: 'Aufstellung offen' }] },
  analysis: ['Das Heimteam hat in der laufenden Saison häufiger getroffen.'],
  assumptions: ['Die Aufstellung ist noch nicht bestätigt.'],
  sources: [{ label: 'Torstatistik', url: 'https://www.espn.com/soccer/', accessedAt: '2026-10-31T12:00:00.000Z' }]
});

function render(prediction: GamePrediction, football = true, scoresStale = false): string {
  return renderToStaticMarkup(createElement(GamePredictionDetails, { prediction, football, scoresStale }));
}

describe('game prediction presentation', () => {
  it('separates a possible exact score from winner odds and scorer evidence', () => {
    const html = render(fixture());
    expect(html).toContain('Mögliches Ergebnis');
    expect(html).toContain('13 % Wahrscheinlichkeit für genau dieses Ergebnis');
    expect(html).toContain('58 % geschätzte Wahrscheinlichkeit');
    expect(html).toContain('Geschätzte Chancen');
    expect(html).toContain('Unentschieden');
    expect(html).toContain('22 %');
    expect(html).toContain('20 %');
    expect(html).toContain('die Siegchance fasst alle möglichen Ergebnisse zusammen');
    expect(html).toContain('Alle Prozentwerte sind Schätzungen');
    expect(html).toContain('2 Saisontore');
    expect(html).toContain('Aufstellung und Einsatz nicht bestätigt');
    expect(html).toContain('Warum diese Einschätzung?');
    expect(html).toContain('https://www.espn.com/soccer/');
    expect(html).toContain('Abgerufen:');
    expect(html).not.toContain('Datenstand:');
  });

  it('uses the provided reasons when exact score, winner, and scorers are unavailable', () => {
    const prediction = fixture();
    prediction.kind = 'unavailable';
    prediction.score = { available: false, label: 'Mögliches Ergebnis', reason: 'Zu wenige aktuelle Spiele.' };
    prediction.winner = { available: false, reason: 'Kein belastbarer Favorit.' };
    prediction.goalscorers = { available: false, players: [], reason: 'Keine aktuelle Torstatistik.' };
    const html = render(prediction);
    expect(html).toContain('Zu wenige aktuelle Spiele.');
    expect(html).toContain('Kein belastbarer Favorit.');
    expect(html).toContain('Keine aktuelle Torstatistik.');
    expect(html).not.toContain('Wahrscheinlichkeit für genau dieses Ergebnis');
  });

  it('presents a completed match as an actual result without predicted scorers or probabilities', () => {
    const prediction = fixture();
    prediction.kind = 'actual';
    prediction.state = 'post';
    prediction.score.label = 'Endergebnis';
    const html = render(prediction);
    expect(html).toContain('Spiel beendet · Tatsächliches Ergebnis');
    expect(html).toContain('Endergebnis');
    expect(html).toContain('Spielausgang');
    expect(html).not.toContain('Mögliches Ergebnis');
    expect(html).not.toContain('Mögliche Torschützen');
    expect(html).not.toContain('Wahrscheinlichkeit');
  });

  it('does not offer a new prediction for a match without a confirmed final result', () => {
    const prediction = fixture();
    prediction.kind = 'unavailable';
    prediction.state = 'post';
    prediction.score = { available: false, label: 'Endergebnis', reason: 'Das Spiel wurde nicht als beendet bestätigt.' };
    prediction.winner = { available: false, reason: 'Kein bestätigter Spielausgang.' };
    const html = render(prediction);
    expect(html).toContain('kein bestätigtes Endergebnis');
    expect(html).not.toContain('Mögliches Ergebnis');
    expect(html).not.toContain('Wahrscheinlicher Sieger');
    expect(html).not.toContain('Mögliche Torschützen');
  });

  it('avoids football-specific labels for other sports and flags stale live scores', () => {
    const prediction = fixture();
    prediction.sport = 'basketball';
    prediction.score.label = 'Mögliches Endergebnis';
    const html = render(prediction, false, true);
    expect(html).not.toMatch(/Torschützen|90 Minuten|Saisontore/);
    expect(html).toContain('Diese Einschätzung kann inzwischen überholt sein.');
  });

  it('clearly limits hockey outcome probabilities to regulation time', () => {
    const prediction = fixture();
    prediction.sport = 'hockey';
    prediction.score.label = 'Möglicher Stand nach 60 Minuten';
    const html = render(prediction, false);
    expect(html).toContain('Tendenz nach 60 Minuten');
    expect(html).not.toContain('Wahrscheinlicher Sieger');
    expect(html).toContain('Unentschieden');
  });

  it.each([
    [0.00104, '0,1 %'],
    [0.00001, '&lt;0,1 %']
  ])('keeps a small positive exact-score chance visible (%s)', (probability, label) => {
    const prediction = fixture();
    prediction.score.probability = probability;
    const html = render(prediction);
    expect(html).toContain(`${label} Wahrscheinlichkeit für genau dieses Ergebnis`);
    expect(html).not.toContain('>0 % Wahrscheinlichkeit für genau dieses Ergebnis');
  });

  it.each([
    [0.9951, '99,5 %'],
    [0.99949, '99,9 %'],
    [0.9999, '&gt;99,9 %']
  ])('does not round an uncertain outcome to certainty (%s)', (probability, label) => {
    const prediction = fixture();
    prediction.winner.probability = probability;
    const html = render(prediction);
    expect(html).toContain(`${label} geschätzte Wahrscheinlichkeit`);
    expect(html).not.toContain('100 % geschätzte Wahrscheinlichkeit');
  });
});
