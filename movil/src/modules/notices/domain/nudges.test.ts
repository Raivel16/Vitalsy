import { baselineForKind } from '../../health-sync/domain/baseline';
import type { BiometricSample } from '../../health-sync/domain/types';
import { caregiverText, draftNudge } from './nudges';

const now = new Date('2026-10-03T12:00:00.000Z');

function series(kind: BiometricSample['kind'], values: number[], unit: string): BiometricSample[] {
  return values.map((value, index) => {
    const date = new Date(Date.UTC(2026, 8, 20 + index));
    const day = date.toISOString().slice(0, 10);
    return {
      id: `${kind}-${index}`,
      kind,
      value,
      unit,
      startedAt: `${day}T08:00:00.000Z`,
      endedAt: `${day}T08:00:00.000Z`,
      origin: 'health_connect' as const,
    };
  });
}

describe('draftNudge', () => {
  it('suggests hydration when the personal range is steady', () => {
    const heart = baselineForKind(series('heart_rate', [62, 63, 64, 65, 66, 64, 63, 65, 64, 66], 'lpm'), 'heart_rate', now);
    const notice = draftNudge([heart], now);
    expect(notice?.kind).toBe('habit');
    expect(notice?.title).toMatch(/hidratación/i);
    expect(notice?.body).not.toMatch(/diagnóstico médico urgente|NEWS2/i);
  });

  it('raises a preventive notice on a sustained heart-rate deviation', () => {
    const calm = series('heart_rate', [60, 61, 62, 63, 62, 61, 60, 62, 63, 61], 'lpm');
    const spike = [120, 118, 122].map((value, index) => ({
      ...calm[0],
      id: `spike-${index}`,
      value,
      startedAt: `2026-10-0${index + 1}T08:00:00.000Z`,
    }));
    const heart = baselineForKind([...calm, ...spike], 'heart_rate', now);
    const notice = draftNudge([heart], now);
    expect(notice?.kind).toBe('deviation');
    expect(notice?.body).toMatch(/no un diagnóstico/i);
  });

  it('suggests a walk when steps fall under the personal range', () => {
    const steps = baselineForKind(
      series('steps', [8000, 8200, 8400, 8600, 8800, 9000, 9100, 8700, 200, 180, 150], 'pasos'),
      'steps',
      now,
    );
    const notice = draftNudge([steps], now);
    expect(notice?.kind).toBe('habit');
    expect(notice?.title).toMatch(/paseo/i);
  });

  it('stays quiet while the baseline is still forming', () => {
    const heart = baselineForKind(series('heart_rate', [64, 65], 'lpm'), 'heart_rate', now);
    expect(draftNudge([heart], now)).toBeNull();
  });
});

describe('caregiverText', () => {
  it('builds a non-diagnostic message for the emergency contact', () => {
    const text = caregiverText(
      {
        id: 'deviation-heart_rate-2026-10-03',
        kind: 'deviation',
        title: 'Un ritmo un poco más alto de lo usual',
        body: 'Aviso',
        createdAt: now.toISOString(),
      },
      'Elena',
    );
    expect(text).toMatch(/Elena/);
    expect(text).toMatch(/No es un diagnóstico/);
  });
});
