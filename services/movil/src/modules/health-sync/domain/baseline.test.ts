import { baselineForKind, overallStatus, percentile } from './baseline';
import type { BiometricSample } from './types';

function sample(day: string, value: number, kind: BiometricSample['kind'] = 'heart_rate'): BiometricSample {
  return {
    id: `${kind}-${day}-${value}`,
    kind,
    value,
    unit: kind === 'spo2' ? '%' : 'lpm',
    startedAt: `${day}T08:00:00.000Z`,
    endedAt: `${day}T08:00:00.000Z`,
    origin: 'health_connect',
  };
}

const now = new Date('2026-10-03T12:00:00.000Z');

function history(values: number[]): BiometricSample[] {
  return values.map((value, index) => {
    const date = new Date(Date.UTC(2026, 8, 20 + index));
    return sample(date.toISOString().slice(0, 10), value);
  });
}

describe('percentile', () => {
  it('interpolates the 10th and 90th ranks', () => {
    const sorted = [60, 62, 64, 66, 68, 70, 72];
    expect(percentile(sorted, 10)).toBeCloseTo(61.2);
    expect(percentile(sorted, 90)).toBeCloseTo(70.8);
  });
});

describe('baselineForKind', () => {
  it('keeps the line in construction until seven fitting days exist', () => {
    const samples = [28, 29, 30, 1, 2, 3].map((day, index) =>
      sample(`${index < 3 ? '2026-09' : '2026-10'}-${String(day).padStart(2, '0')}`, 64),
    );
    const result = baselineForKind(samples, 'heart_rate', now);
    expect(result.status).toBe('building');
    expect(result.low).toBeNull();
    expect(result.latest).toBe(64);
  });

  it('marks a personal range as within when the latest readings stay inside it', () => {
    const samples = history([62, 63, 64, 65, 66, 64, 63, 65, 64, 66]);
    const result = baselineForKind(samples, 'heart_rate', now);
    expect(result.status).toBe('within');
    expect(result.low).not.toBeNull();
    expect(result.high).not.toBeNull();
    expect(result.latest).toBe(66);
  });

  it('flags three consecutive readings outside the personal range', () => {
    const calm = history([60, 61, 62, 63, 62, 61, 60, 62, 63, 61]);
    const spike = [120, 118, 122].map((value, index) =>
      sample(`2026-10-0${index + 1}`, value),
    );
    const result = baselineForKind([...calm, ...spike], 'heart_rate', now);
    expect(result.status).toBe('sustained_deviation');
    expect(result.latest).toBe(122);
  });

  it('does not treat low steps as a clinical deviation', () => {
    const steps = [8000, 9000, 8500, 8700, 9100, 8800, 8600, 8400, 100, 80, 90].map((value, index) => {
      const date = new Date(Date.UTC(2026, 8, 20 + index));
      return {
        ...sample(date.toISOString().slice(0, 10), value, 'steps'),
        unit: 'pasos',
      };
    });
    const result = baselineForKind(steps, 'steps', now);
    expect(result.status).toBe('within');
    expect(result.latest).toBe(90);
    expect(result.low).not.toBeNull();
    expect(result.latest!).toBeLessThan(result.low!);
  });
});

describe('overallStatus', () => {
  it('prefers a sustained deviation over a calm metric', () => {
    const heart = baselineForKind(
      [...history([60, 61, 62, 63, 62, 61, 60, 62, 63, 61]), sample('2026-10-01', 120), sample('2026-10-02', 121), sample('2026-10-03', 119)],
      'heart_rate',
      now,
    );
    const oxygen = baselineForKind(
      history([97, 98, 98, 97, 99, 98, 97, 98, 98, 97]).map((item) => ({ ...item, kind: 'spo2' as const, unit: '%' })),
      'spo2',
      now,
    );
    expect(overallStatus([heart, oxygen])).toBe('sustained_deviation');
  });
});
