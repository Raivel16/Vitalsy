import type { BandLive } from '../../band/bandController';
import type { TodayMetric, TodaySnapshot } from './today';

export type BandLiveState = { connected: boolean; live: BandLive | null };

function liveMetric(kind: 'heart_rate' | 'spo2', band: BandLiveState): TodayMetric {
  const value = kind === 'heart_rate' ? band.live?.bpm : band.live?.spo2;
  const hasValue = value !== null && value !== undefined;
  const waiting = band.live?.phase === 'no_finger' ? 'coloca el dedo' : 'midiendo…';
  return {
    kind,
    label: kind === 'heart_rate' ? 'Pulso' : 'SpO2',
    valueLabel: hasValue ? String(value) : '--',
    unit: kind === 'heart_rate' ? 'lpm' : '%',
    footnote: `Vitalsy Band · ${hasValue ? 'en vivo' : waiting}`,
  };
}

/**
 * Con la banda conectada, las tarjetas de pulso y SpO2 son las de la banda (en vivo); lo que no mide la
 * banda (pasos, sueño…) sigue viniendo del teléfono. Sin banda conectada no cambia nada.
 */
export function applyBandLive(snapshot: TodaySnapshot, band: BandLiveState): TodaySnapshot {
  if (!band.connected) {
    return snapshot;
  }
  const fromBand = [liveMetric('heart_rate', band), liveMetric('spo2', band)];
  const rest = snapshot.metrics.filter((metric) => metric.kind !== 'heart_rate' && metric.kind !== 'spo2');
  return { ...snapshot, empty: false, metrics: [...fromBand, ...rest] };
}
