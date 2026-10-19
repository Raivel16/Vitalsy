import type { BiometricKind, BiometricSample } from './types';

type DateLike = string | Date;

export type HealthKitQuantity = { startDate: DateLike; endDate: DateLike; quantity: number };
/** `value` es HKCategoryValueSleepAnalysis: 0 en cama, 1 dormido, 2 despierto, 3 core, 4 profundo, 5 REM. */
export type HealthKitSleep = { startDate: DateLike; endDate: DateLike; value: number };

export type HealthKitBundle = {
  heartRate?: HealthKitQuantity[];
  restingHeartRate?: HealthKitQuantity[];
  /** SDNN en milisegundos (Apple no entrega RMSSD). */
  hrvSdnn?: HealthKitQuantity[];
  /** Fracción 0-1 (HKUnit.percent); también se acepta 0-100. */
  oxygenSaturation?: HealthKitQuantity[];
  steps?: HealthKitQuantity[];
  bodyTemperature?: HealthKitQuantity[];
  sleep?: HealthKitSleep[];
};

export type MapHealthKitOptions = {
  /** Las noches que terminan después de este instante siguen en curso y se omiten hasta la próxima lectura. */
  sleepSettledBefore?: DateLike;
};

const ASLEEP_VALUES = new Set([1, 3, 4, 5]);
const NIGHT_GAP_MS = 2 * 60 * 60 * 1000;

function iso(value: DateLike): string | null {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function idFor(kind: BiometricKind, at: string, value: number): string {
  return `hk:${kind}:${at}:${value}`;
}

function quantities(
  records: HealthKitQuantity[] | undefined,
  kind: BiometricKind,
  unit: string,
  convert: (value: number) => number = (value) => value,
): BiometricSample[] {
  const samples: BiometricSample[] = [];
  for (const record of records ?? []) {
    const startedAt = iso(record.startDate);
    const endedAt = iso(record.endDate);
    if (!startedAt || !endedAt || !Number.isFinite(record.quantity) || record.quantity < 0) {
      continue;
    }
    const value = round(convert(record.quantity));
    samples.push({ id: idFor(kind, startedAt, value), kind, value, unit, startedAt, endedAt, origin: 'health_kit' });
  }
  return samples;
}

function nights(records: HealthKitSleep[] | undefined, settledBefore: number | null): BiometricSample[] {
  const spans = (records ?? [])
    .filter((record) => ASLEEP_VALUES.has(record.value))
    .map((record) => ({ start: Date.parse(iso(record.startDate) ?? ''), end: Date.parse(iso(record.endDate) ?? '') }))
    .filter((span) => Number.isFinite(span.start) && Number.isFinite(span.end) && span.end > span.start)
    .sort((left, right) => left.start - right.start);

  // Fuentes solapadas (reloj + teléfono) no deben duplicar minutos: se unen los intervalos.
  const merged: Array<{ start: number; end: number }> = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }

  const groups: Array<{ start: number; end: number; minutes: number }> = [];
  for (const span of merged) {
    const last = groups.at(-1);
    const minutes = (span.end - span.start) / 60000;
    if (last && span.start - last.end <= NIGHT_GAP_MS) {
      last.end = span.end;
      last.minutes += minutes;
    } else {
      groups.push({ start: span.start, end: span.end, minutes });
    }
  }

  return groups
    .filter((group) => settledBefore === null || group.end <= settledBefore)
    .map((group) => {
      const startedAt = new Date(group.start).toISOString();
      const value = round(group.minutes);
      const endedAt = new Date(group.end).toISOString();
      return {
        // Estable por el INICIO de la noche (no por la fecha de fin: una siesta de la mañana y la noche
        // pueden terminar el mismo día). Si la noche crece al llegar más segmentos el inicio no cambia,
        // el id es el mismo y la muestra nueva reemplaza a la anterior en vez de duplicarla.
        id: `hk:sleep:${startedAt}`,
        kind: 'sleep' as const,
        value,
        unit: 'min',
        startedAt,
        endedAt,
        origin: 'health_kit' as const,
      };
    });
}

/** Pura y sin módulos nativos: convierte lo que devuelve HealthKit al modelo interno. */
export function mapHealthKitSamples(bundle: HealthKitBundle, options: MapHealthKitOptions = {}): BiometricSample[] {
  const settled = options.sleepSettledBefore === undefined ? null : Date.parse(iso(options.sleepSettledBefore) ?? '');
  return [
    ...quantities(bundle.heartRate, 'heart_rate', 'lpm'),
    ...quantities(bundle.restingHeartRate, 'resting_heart_rate', 'lpm'),
    ...quantities(bundle.hrvSdnn, 'hrv', 'ms'),
    ...quantities(bundle.oxygenSaturation, 'spo2', '%', (value) => (value <= 1 ? value * 100 : value)),
    ...quantities(bundle.steps, 'steps', 'pasos'),
    ...nights(bundle.sleep, settled !== null && Number.isFinite(settled) ? settled : null),
    ...quantities(bundle.bodyTemperature, 'body_temperature', '°C'),
  ];
}
