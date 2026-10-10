import { buildBaselines, overallStatus, type MetricBaseline } from '../../health-sync/domain/baseline';
import { PRIMARY_KINDS, type BiometricKind, type BiometricSample } from '../../health-sync/domain/types';
import { draftNudge, type NoticeDraft } from '../../notices/domain/nudges';

export type TodayMetric = {
  kind: BiometricKind;
  label: string;
  valueLabel: string;
  unit: string;
  footnote: string;
};

export type TodaySnapshot = {
  empty: boolean;
  status: 'building' | 'within' | 'sustained_deviation';
  headline: string;
  summary: string;
  metrics: TodayMetric[];
  nudge: NoticeDraft | null;
  updatedAt: string | null;
};

const LABELS: Record<BiometricKind, string> = {
  heart_rate: 'Pulso',
  resting_heart_rate: 'Pulso en reposo',
  hrv: 'Variabilidad',
  spo2: 'SpO2',
  sleep: 'Sueño',
  steps: 'Pasos',
  skin_temperature: 'Temp. cutánea',
  body_temperature: 'Temperatura',
};

export function formatMetricValue(kind: BiometricKind, value: number): { valueLabel: string; unit: string } {
  if (kind === 'sleep') {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return { valueLabel: `${hours}h ${String(minutes).padStart(2, '0')}m`, unit: '' };
  }
  if (kind === 'steps') {
    return { valueLabel: new Intl.NumberFormat('es-PE').format(Math.round(value)), unit: 'pasos' };
  }
  if (kind === 'spo2') {
    return { valueLabel: String(Math.round(value)), unit: '%' };
  }
  if (kind === 'skin_temperature' || kind === 'body_temperature') {
    return { valueLabel: value.toFixed(1), unit: '°C' };
  }
  if (kind === 'hrv') {
    return { valueLabel: String(Math.round(value)), unit: 'ms' };
  }
  return { valueLabel: String(Math.round(value)), unit: 'lpm' };
}

function footnote(metric: MetricBaseline): string {
  if (metric.latest === null) {
    return 'Sin lectura en 14 días';
  }
  if (metric.status === 'building' || metric.low === null || metric.high === null) {
    return 'Línea de base en construcción';
  }
  const low = formatMetricValue(metric.kind, metric.low).valueLabel;
  const high = formatMetricValue(metric.kind, metric.high).valueLabel;
  if (metric.status === 'sustained_deviation') {
    return `Fuera de tu rango usual (${low}–${high})`;
  }
  if (metric.latest < metric.low) {
    return `Por debajo de tu usual (${low}–${high})`;
  }
  return `Rango usual (${low}–${high})`;
}

export function buildToday(samples: BiometricSample[], now: Date): TodaySnapshot {
  const kinds = [...PRIMARY_KINDS];
  for (const extra of ['hrv', 'skin_temperature', 'body_temperature'] as BiometricKind[]) {
    if (samples.some((sample) => sample.kind === extra)) {
      kinds.push(extra);
    }
  }
  const baselines = buildBaselines(samples, now, kinds);
  const visible = baselines.filter((item) => item.latest !== null);
  const status = visible.length === 0 ? 'building' : overallStatus(baselines);
  const nudge = draftNudge(baselines, now);
  const updatedAt = visible
    .map((item) => item.latestAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b))
    .at(-1) ?? null;

  return {
    empty: visible.length === 0,
    status,
    headline:
      status === 'sustained_deviation'
        ? 'Un cambio sostenido respecto a tu ritmo'
        : status === 'within'
          ? 'Ritmo armónico y en calma'
          : 'Estamos conociendo tu ritmo',
    summary:
      status === 'sustained_deviation'
        ? 'Varias lecturas se alejan de tu línea de base personal. Es información preventiva, no un diagnóstico.'
        : status === 'within'
          ? 'Tus lecturas recientes se mantienen dentro de tu promedio usual.'
          : 'Hacen falta unos días de lecturas para calcular tu línea de base personal.',
    metrics: visible.map((item) => {
      const formatted = formatMetricValue(item.kind, item.latest!);
      return {
        kind: item.kind,
        label: LABELS[item.kind],
        valueLabel: formatted.valueLabel,
        unit: formatted.unit,
        footnote: footnote(item),
      };
    }),
    nudge,
    updatedAt,
  };
}

export function validateManual(kind: 'heart_rate' | 'spo2', raw: string): string | null {
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value)) {
    return 'Escribe un número.';
  }
  if (kind === 'heart_rate' && (value < 30 || value > 220)) {
    return 'El pulso debe estar entre 30 y 220 lpm.';
  }
  if (kind === 'spo2' && (value < 50 || value > 100)) {
    return 'La SpO2 debe estar entre 50 y 100 %.';
  }
  return null;
}
