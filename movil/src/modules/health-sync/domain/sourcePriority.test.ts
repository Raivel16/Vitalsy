import { preferBand } from './sourcePriority';
import type { BiometricSample } from './types';

function sample(patch: Partial<BiometricSample> & { at: string }): BiometricSample {
  const { at, ...rest } = patch;
  return {
    id: `${rest.origin ?? 'health_connect'}-${rest.kind ?? 'heart_rate'}-${at}`,
    kind: 'heart_rate',
    value: 70,
    unit: 'lpm',
    startedAt: at,
    endedAt: at,
    origin: 'health_connect',
    ...rest,
  };
}

describe('preferBand', () => {
  it('drops Health Connect pulse readings taken within 5 minutes of a band reading', () => {
    const band = sample({ at: '2026-10-30T12:00:00.000Z', origin: 'vitalsy_band' });
    const near = sample({ at: '2026-10-30T12:04:00.000Z' });
    const before = sample({ at: '2026-10-30T11:56:00.000Z' });
    expect(preferBand([band, near, before])).toEqual([band]);
  });

  it('keeps Health Connect readings once the band went quiet for more than 5 minutes', () => {
    const band = sample({ at: '2026-10-30T12:00:00.000Z', origin: 'vitalsy_band' });
    const later = sample({ at: '2026-10-30T12:06:00.000Z' });
    expect(preferBand([band, later])).toEqual([band, later]);
  });

  it('keeps the backup before and after a band session', () => {
    const minutes = [0, 1, 2, 3].map((minute) => sample({ at: `2026-10-30T12:0${minute}:00.000Z`, origin: 'vitalsy_band' }));
    const hc = ['11:30', '12:01', '13:00'].map((time) => sample({ at: `2026-10-30T${time}:00.000Z` }));
    expect(preferBand([...minutes, ...hc]).filter((item) => item.origin === 'health_connect').map((item) => item.startedAt)).toEqual([
      '2026-10-30T11:30:00.000Z',
      '2026-10-30T13:00:00.000Z',
    ]);
  });

  it('compares each kind on its own: a band pulse does not hide Health Connect SpO2', () => {
    const band = sample({ at: '2026-10-30T12:00:00.000Z', origin: 'vitalsy_band' });
    const spo2 = sample({ at: '2026-10-30T12:01:00.000Z', kind: 'spo2', unit: '%', value: 97 });
    expect(preferBand([band, spo2])).toEqual([band, spo2]);
  });

  it('never hides steps, sleep or manual readings', () => {
    const band = sample({ at: '2026-10-30T12:00:00.000Z', origin: 'vitalsy_band' });
    const steps = sample({ at: '2026-10-30T12:01:00.000Z', kind: 'steps', unit: 'count', value: 900 });
    const manual = sample({ at: '2026-10-30T12:01:00.000Z', origin: 'manual' });
    expect(preferBand([band, steps, manual])).toEqual([band, steps, manual]);
  });

  it('returns the samples untouched when there is no band', () => {
    const samples = [sample({ at: '2026-10-30T12:00:00.000Z' })];
    expect(preferBand(samples)).toBe(samples);
  });
});
