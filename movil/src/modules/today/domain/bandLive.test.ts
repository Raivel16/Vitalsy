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

const live = { phase: 'measuring' as const, quality: 'good' as const, bpm: 68, spo2: 98, pi: 2 };

describe('applyBandLive', () => {
  it('leaves the snapshot untouched when the band is not connected', () => {
    expect(applyBandLive(base, { connected: false, live })).toBe(base);
  });

  it('shows the band pulse and SpO2 in the same cards and keeps the other metrics', () => {
    const view = applyBandLive(base, { connected: true, live });
    expect(view.metrics).toEqual([
      { kind: 'heart_rate', label: 'Pulso', valueLabel: '68', unit: 'lpm', footnote: 'Vitalsy Band · en vivo' },
      { kind: 'spo2', label: 'SpO2', valueLabel: '98', unit: '%', footnote: 'Vitalsy Band · en vivo' },
      base.metrics[2],
    ]);
  });

  it('shows -- and asks for the finger instead of a Health Connect value', () => {
    const view = applyBandLive(base, { connected: true, live: { phase: 'no_finger', quality: null, bpm: null, spo2: null, pi: 0 } });
    expect(view.metrics.slice(0, 2).map((metric) => [metric.valueLabel, metric.footnote])).toEqual([
      ['--', 'Vitalsy Band · coloca el dedo'],
      ['--', 'Vitalsy Band · coloca el dedo'],
    ]);
  });

  it('says it is measuring while the band has no value yet', () => {
    const view = applyBandLive(base, { connected: true, live: { ...live, bpm: null, spo2: null } });
    expect(view.metrics[0].footnote).toBe('Vitalsy Band · midiendo…');
    expect(applyBandLive(base, { connected: true, live: null }).metrics[0].footnote).toBe('Vitalsy Band · midiendo…');
  });

  it('adds the cards when there is nothing stored yet, and the empty state goes away', () => {
    const empty: TodaySnapshot = { ...base, empty: true, metrics: [] };
    const view = applyBandLive(empty, { connected: true, live });
    expect(view.empty).toBe(false);
    expect(view.metrics.map((metric) => metric.kind)).toEqual(['heart_rate', 'spo2']);
  });
});
