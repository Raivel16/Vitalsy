import type { BiometricSample } from './types';

export type HealthConnectBundle = {
  heartRate?: Array<{ startTime: string; endTime: string; samples: Array<{ time: string; beatsPerMinute: number }> }>;
  restingHeartRate?: Array<{ time: string; beatsPerMinute: number }>;
  hrv?: Array<{ time: string; heartRateVariabilityMillis: number }>;
  oxygenSaturation?: Array<{ time: string; percentage: number }>;
  steps?: Array<{ startTime: string; endTime: string; count: number }>;
  sleep?: Array<{ startTime: string; endTime: string }>;
  skinTemperature?: Array<{ time: string; celsius: number }>;
  bodyTemperature?: Array<{ time: string; celsius: number }>;
};

function idFor(kind: string, at: string, value: number): string {
  return `hc:${kind}:${at}:${value}`;
}

export function mapHealthConnectRecords(bundle: HealthConnectBundle): BiometricSample[] {
  const samples: BiometricSample[] = [];

  for (const record of bundle.heartRate ?? []) {
    for (const beat of record.samples) {
      samples.push({
        id: idFor('heart_rate', beat.time, beat.beatsPerMinute),
        kind: 'heart_rate',
        value: beat.beatsPerMinute,
        unit: 'lpm',
        startedAt: beat.time,
        endedAt: beat.time,
        origin: 'health_connect',
      });
    }
  }

  for (const record of bundle.restingHeartRate ?? []) {
    samples.push({
      id: idFor('resting_heart_rate', record.time, record.beatsPerMinute),
      kind: 'resting_heart_rate',
      value: record.beatsPerMinute,
      unit: 'lpm',
      startedAt: record.time,
      endedAt: record.time,
      origin: 'health_connect',
    });
  }

  for (const record of bundle.hrv ?? []) {
    samples.push({
      id: idFor('hrv', record.time, record.heartRateVariabilityMillis),
      kind: 'hrv',
      value: record.heartRateVariabilityMillis,
      unit: 'ms',
      startedAt: record.time,
      endedAt: record.time,
      origin: 'health_connect',
    });
  }

  for (const record of bundle.oxygenSaturation ?? []) {
    samples.push({
      id: idFor('spo2', record.time, record.percentage),
      kind: 'spo2',
      value: record.percentage,
      unit: '%',
      startedAt: record.time,
      endedAt: record.time,
      origin: 'health_connect',
    });
  }

  for (const record of bundle.steps ?? []) {
    samples.push({
      id: idFor('steps', record.startTime, record.count),
      kind: 'steps',
      value: record.count,
      unit: 'pasos',
      startedAt: record.startTime,
      endedAt: record.endTime,
      origin: 'health_connect',
    });
  }

  for (const record of bundle.sleep ?? []) {
    const minutes = Math.max(0, (Date.parse(record.endTime) - Date.parse(record.startTime)) / 60000);
    samples.push({
      id: idFor('sleep', record.startTime, minutes),
      kind: 'sleep',
      value: minutes,
      unit: 'min',
      startedAt: record.startTime,
      endedAt: record.endTime,
      origin: 'health_connect',
    });
  }

  for (const record of bundle.skinTemperature ?? []) {
    samples.push({
      id: idFor('skin_temperature', record.time, record.celsius),
      kind: 'skin_temperature',
      value: record.celsius,
      unit: '°C',
      startedAt: record.time,
      endedAt: record.time,
      origin: 'health_connect',
    });
  }

  for (const record of bundle.bodyTemperature ?? []) {
    samples.push({
      id: idFor('body_temperature', record.time, record.celsius),
      kind: 'body_temperature',
      value: record.celsius,
      unit: '°C',
      startedAt: record.time,
      endedAt: record.time,
      origin: 'health_connect',
    });
  }

  return samples;
}
