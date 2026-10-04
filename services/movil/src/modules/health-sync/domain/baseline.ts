import { DEVIATION_KINDS, type BiometricKind, type BiometricSample } from './types';

export type BaselineStatus = 'building' | 'within' | 'sustained_deviation';

export type MetricBaseline = {
  kind: BiometricKind;
  status: BaselineStatus;
  latest: number | null;
  latestAt: string | null;
  low: number | null;
  high: number | null;
  unit: string | null;
  fittingDays: number;
};

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_DAYS = 7;
const TAIL = 3;

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    throw new Error('percentile requires values');
  }
  if (sorted.length === 1) {
    return sorted[0];
  }
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) {
    return sorted[low];
  }
  const weight = rank - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function inWindow(sample: BiometricSample, now: Date): boolean {
  const at = Date.parse(sample.startedAt);
  return at >= now.getTime() - WINDOW_MS && at <= now.getTime();
}

function outside(value: number, low: number, high: number): boolean {
  return value < low || value > high;
}

export function baselineForKind(samples: BiometricSample[], kind: BiometricKind, now: Date): MetricBaseline {
  const series = samples
    .filter((sample) => sample.kind === kind && inWindow(sample, now))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  const latest = series.at(-1) ?? null;
  const fitting = series.length > TAIL ? series.slice(0, series.length - TAIL) : [];
  const fittingDays = new Set(fitting.map((sample) => dayKey(sample.startedAt))).size;

  if (!latest || fittingDays < MIN_DAYS) {
    return {
      kind,
      status: 'building',
      latest: latest?.value ?? null,
      latestAt: latest?.startedAt ?? null,
      low: null,
      high: null,
      unit: latest?.unit ?? series[0]?.unit ?? null,
      fittingDays,
    };
  }

  const values = fitting.map((sample) => sample.value).sort((a, b) => a - b);
  const low = percentile(values, 10);
  const high = percentile(values, 90);
  const tail = series.slice(-TAIL);
  const sustained =
    DEVIATION_KINDS.includes(kind) && tail.length === TAIL && tail.every((sample) => outside(sample.value, low, high));

  return {
    kind,
    status: sustained ? 'sustained_deviation' : 'within',
    latest: latest.value,
    latestAt: latest.startedAt,
    low,
    high,
    unit: latest.unit,
    fittingDays,
  };
}

export function buildBaselines(samples: BiometricSample[], now: Date, kinds: BiometricKind[]): MetricBaseline[] {
  return kinds.map((kind) => baselineForKind(samples, kind, now));
}

export function overallStatus(baselines: MetricBaseline[]): BaselineStatus {
  if (baselines.some((item) => item.status === 'sustained_deviation')) {
    return 'sustained_deviation';
  }
  const ready = baselines.filter((item) => item.kind === 'heart_rate' || item.kind === 'spo2');
  if (ready.length > 0 && ready.every((item) => item.status === 'building' || item.latest === null)) {
    return 'building';
  }
  if (baselines.every((item) => item.latest === null)) {
    return 'building';
  }
  return 'within';
}
