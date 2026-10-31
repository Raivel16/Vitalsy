import type { BiometricSample } from './types';

/** Una lectura automática de otra fuente se ignora si la banda midió lo mismo a menos de esto. */
export const BAND_PRIORITY_WINDOW_MS = 5 * 60 * 1000;

const BAND_KINDS = new Set(['heart_rate', 'spo2']);
const AUTOMATIC_ORIGINS = new Set(['health_connect', 'health_kit']);

/**
 * Para mostrar y calcular (hoy, tendencias, línea de base): donde la banda Vitalsy midió pulso o SpO2, sus
 * lecturas tienen prioridad y las de Health Connect / Apple Health quedan como respaldo, sin mezclar
 * dos fuentes en el mismo momento. Si la banda se apaga, a los pocos minutos vuelven a contar.
 * Solo filtra la vista: nada se borra ni deja de enviarse al servidor.
 */
export function preferBand(samples: BiometricSample[]): BiometricSample[] {
  const bandTimes = new Map<string, number[]>();
  for (const sample of samples) {
    if (sample.origin === 'vitalsy_band' && BAND_KINDS.has(sample.kind)) {
      const list = bandTimes.get(sample.kind) ?? [];
      list.push(Date.parse(sample.startedAt));
      bandTimes.set(sample.kind, list);
    }
  }
  if (bandTimes.size === 0) {
    return samples;
  }
  return samples.filter((sample) => {
    const times = bandTimes.get(sample.kind);
    if (!times || !AUTOMATIC_ORIGINS.has(sample.origin)) {
      return true;
    }
    const at = Date.parse(sample.startedAt);
    return !times.some((time) => Math.abs(time - at) <= BAND_PRIORITY_WINDOW_MS);
  });
}
