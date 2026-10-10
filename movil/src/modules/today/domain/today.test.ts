import type { BiometricSample } from '../../health-sync/domain/types';
import { buildToday, validateManual } from './today';

const now = new Date('2026-10-03T12:00:00.000Z');

describe('buildToday', () => {
  it('is empty when there are no readings', () => {
    const today = buildToday([], now);
    expect(today.empty).toBe(true);
    expect(today.metrics).toEqual([]);
    expect(today.nudge).toBeNull();
  });

  it('rejects a manual pulse outside the allowed range', () => {
    expect(validateManual('heart_rate', '10')).toMatch(/30 y 220/);
    expect(validateManual('spo2', '101')).toMatch(/50 y 100/);
    expect(validateManual('heart_rate', '64')).toBeNull();
  });
});

describe('format helpers via today', () => {
  it('shows a manual reading while the baseline is still forming', () => {
    const sample: BiometricSample = {
      id: 'm1',
      kind: 'heart_rate',
      value: 64,
      unit: 'lpm',
      startedAt: '2026-10-03T08:00:00.000Z',
      endedAt: '2026-10-03T08:00:00.000Z',
      origin: 'manual',
    };
    const today = buildToday([sample], now);
    expect(today.empty).toBe(false);
    expect(today.metrics[0].valueLabel).toBe('64');
    expect(today.metrics[0].footnote).toMatch(/construcción/i);
  });

  it('reports the most recent reading across metrics as the update time', () => {
    const sample = (id: string, kind: BiometricSample['kind'], value: number, at: string): BiometricSample => ({
      id,
      kind,
      value,
      unit: kind === 'spo2' ? '%' : 'lpm',
      startedAt: at,
      endedAt: at,
      origin: 'manual',
    });
    const today = buildToday(
      [
        sample('a', 'spo2', 97, '2026-10-03T10:30:00.000Z'),
        sample('b', 'heart_rate', 64, '2026-10-03T07:15:00.000Z'),
        sample('c', 'heart_rate', 66, '2026-10-02T23:59:00.000Z'),
      ],
      now,
    );
    expect(today.updatedAt).toBe('2026-10-03T10:30:00.000Z');
    expect(buildToday([], now).updatedAt).toBeNull();
  });
});
