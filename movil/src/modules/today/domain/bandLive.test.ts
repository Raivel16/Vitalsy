import { applyBandLive } from './bandLive';
import type { TodaySnapshot } from './today';

const base: TodaySnapshot = {
  empty: false,
  status: 'within',
  headline: 'Ritmo armónico y en calma',
  summary: 'Tus lecturas recientes se mantienen dentro de tu promedio usual.',
  metrics: [
    { kind: 'heart_rate', label: 'Pulso', valueLabel: '74', unit: 'lpm', footnote: 'Línea de base en construcción' },
    { kind: 'spo2', label: 'SpO2', valueLabel: '99', unit: '%', footnote: 'Rango usual (97–99)' },
    { kind: 'steps', label: 'Pasos', valueLabel: '3.200', unit: 'pasos', footnote: 'Línea de base en construcción' },
  ],
  nudge: null,
  updatedAt: null,
};

const NOW = 1_000_000_000;
const MIN = 60_000;
const live = { phase: 'measuring' as const, quality: 'good' as const, bpm: 68, spo2: 98, pi: 2, fingerOffSince: null };
const noFinger = (minutesAgo: number) => ({
  ...live,
  phase: 'no_finger' as const,
  quality: null,
  pi: 0,
  fingerOffSince: NOW - minutesAgo * MIN,
});

describe('applyBandLive', () => {
  it('leaves the snapshot untouched when the band is not connected', () => {
    expect(applyBandLive(base, { connected: false, live, now: NOW })).toBe(base);
  });

  it('shows the band pulse and SpO2 in the same cards and keeps the other metrics', () => {
    const view = applyBandLive(base, { connected: true, live, now: NOW });
    expect(view.metrics).toEqual([
      { kind: 'heart_rate', label: 'Pulso', valueLabel: '68', unit: 'lpm', footnote: 'Vitalsy Band · en vivo' },
      { kind: 'spo2', label: 'SpO2', valueLabel: '98', unit: '%', footnote: 'Vitalsy Band · en vivo' },
      base.metrics[2],
    ]);
  });

  it('keeps the last reading when the finger is removed and asks for it below', () => {
    const view = applyBandLive(base, { connected: true, live: noFinger(2), now: NOW });
    expect(view.metrics.slice(0, 2).map((metric) => [metric.valueLabel, metric.footnote])).toEqual([
      ['68', 'Vitalsy Band · última lectura · coloca el dedo'],
      ['98', 'Vitalsy Band · última lectura · coloca el dedo'],
    ]);
  });

  it('gives the cards back to the stored data after 5 minutes without finger', () => {
    expect(applyBandLive(base, { connected: true, live: noFinger(4), now: NOW }).metrics[0].valueLabel).toBe('68');
    expect(applyBandLive(base, { connected: true, live: noFinger(5), now: NOW })).toBe(base);
  });

  it('shows the stored data while the band has not measured anything yet', () => {
    expect(applyBandLive(base, { connected: true, live: null, now: NOW })).toBe(base);
    expect(applyBandLive(base, { connected: true, live: { ...live, bpm: null, spo2: null }, now: NOW })).toBe(base);
  });

  it('shows -- for the value the band has not produced yet instead of a Health Connect one', () => {
    const view = applyBandLive(base, { connected: true, live: { ...live, spo2: null }, now: NOW });
    expect(view.metrics[0].valueLabel).toBe('68');
    expect([view.metrics[1].valueLabel, view.metrics[1].footnote]).toEqual(['--', 'Vitalsy Band · midiendo…']);
  });

  it('adds the cards when there is nothing stored yet, and the empty state goes away', () => {
    const empty: TodaySnapshot = { ...base, empty: true, metrics: [] };
    const view = applyBandLive(empty, { connected: true, live, now: NOW });
    expect(view.empty).toBe(false);
    expect(view.metrics.map((metric) => metric.kind)).toEqual(['heart_rate', 'spo2']);
  });
});
