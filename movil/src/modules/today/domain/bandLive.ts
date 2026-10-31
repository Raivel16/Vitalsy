import { BAND_PRIORITY_WINDOW_MS } from '../../health-sync/domain/sourcePriority';
import type { BandLive } from '../../band/bandController';
import type { TodayMetric, TodaySnapshot } from './today';

export type BandLiveState = { connected: boolean; live: BandLive | null; /** ms */ now: number };

/** Sin dedo durante este tiempo, las tarjetas vuelven a lo guardado (incluye Health Connect). */
export const BAND_FINGER_OFF_TIMEOUT_MS = BAND_PRIORITY_WINDOW_MS;

function liveMetric(kind: 'heart_rate' | 'spo2', live: BandLive): TodayMetric {
  const value = kind === 'heart_rate' ? live.bpm : live.spo2;
  let note = 'en vivo';
  if (value === null) {
    note = live.phase === 'no_finger' ? 'coloca el dedo' : 'midiendo…';
  } else if (live.fingerOffSince !== null) {
    note = 'última lectura · coloca el dedo';
  }
  return {
    kind,
    label: kind === 'heart_rate' ? 'Pulso' : 'SpO2',
    valueLabel: value === null ? '--' : String(value),
    unit: kind === 'heart_rate' ? 'lpm' : '%',
    footnote: `Vitalsy Band · ${note}`,
  };
}

/**
 * Con la banda conectada, las tarjetas de pulso y SpO2 son las de la banda (en vivo); sin dedo conservan
 * la última lectura hasta pasado un rato, y entonces vuelven a lo guardado. Lo que no mide la banda
 * (pasos, sueño…) sigue viniendo del teléfono. Sin banda conectada no cambia nada.
 */
export function applyBandLive(snapshot: TodaySnapshot, { connected, live, now }: BandLiveState): TodaySnapshot {
  if (!connected || !live || (live.bpm === null && live.spo2 === null)) {
    return snapshot;
  }
  if (live.fingerOffSince !== null && now - live.fingerOffSince >= BAND_FINGER_OFF_TIMEOUT_MS) {
    return snapshot;
  }
  const fromBand = [liveMetric('heart_rate', live), liveMetric('spo2', live)];
  const rest = snapshot.metrics.filter((metric) => metric.kind !== 'heart_rate' && metric.kind !== 'spo2');
  return { ...snapshot, empty: false, metrics: [...fromBand, ...rest] };
}
