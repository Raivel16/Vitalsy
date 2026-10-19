import { mapHealthKitSamples } from './mapHealthKitSamples';

const T0 = '2026-10-03T08:00:00.000Z';

describe('mapHealthKitSamples', () => {
  it('maps quantity samples into internal samples with origin health_kit', () => {
    const samples = mapHealthKitSamples({
      heartRate: [{ startDate: T0, endDate: T0, quantity: 64 }],
      restingHeartRate: [{ startDate: T0, endDate: T0, quantity: 55 }],
      hrvSdnn: [{ startDate: T0, endDate: T0, quantity: 42.5 }],
      steps: [{ startDate: '2026-10-03T07:00:00.000Z', endDate: '2026-10-03T08:00:00.000Z', quantity: 900 }],
      bodyTemperature: [{ startDate: T0, endDate: T0, quantity: 36.7 }],
    });

    expect(samples.map((item) => [item.kind, item.value, item.unit])).toEqual([
      ['heart_rate', 64, 'lpm'],
      ['resting_heart_rate', 55, 'lpm'],
      ['hrv', 42.5, 'ms'],
      ['steps', 900, 'pasos'],
      ['body_temperature', 36.7, '°C'],
    ]);
    expect(samples.every((item) => item.origin === 'health_kit')).toBe(true);
    expect(samples[3]).toMatchObject({ startedAt: '2026-10-03T07:00:00.000Z', endedAt: '2026-10-03T08:00:00.000Z' });
  });

  it('converts oxygen saturation from a 0-1 fraction to percent and keeps a 0-100 value', () => {
    const samples = mapHealthKitSamples({
      oxygenSaturation: [
        { startDate: T0, endDate: T0, quantity: 0.97 },
        { startDate: '2026-10-03T09:00:00.000Z', endDate: '2026-10-03T09:00:00.000Z', quantity: 96 },
      ],
    });

    expect(samples.map((item) => item.value)).toEqual([97, 96]);
    expect(samples.every((item) => item.kind === 'spo2' && item.unit === '%')).toBe(true);
  });

  it('accepts Date objects and normalizes them to ISO strings', () => {
    const [sample] = mapHealthKitSamples({ heartRate: [{ startDate: new Date(T0), endDate: new Date(T0), quantity: 70 }] });
    expect(sample.startedAt).toBe(T0);
  });

  it('produces deterministic ids so a repeated read can be deduplicated', () => {
    const bundle = { heartRate: [{ startDate: T0, endDate: T0, quantity: 64 }] };
    const first = mapHealthKitSamples(bundle);
    const second = mapHealthKitSamples(JSON.parse(JSON.stringify(bundle)));
    expect(first[0].id).toBe(second[0].id);
    expect(first[0].id).toMatch(/^hk:heart_rate:/);
  });

  it('skips records with non-finite or negative values', () => {
    const samples = mapHealthKitSamples({
      heartRate: [
        { startDate: T0, endDate: T0, quantity: Number.NaN },
        { startDate: T0, endDate: T0, quantity: -3 },
      ],
    });
    expect(samples).toEqual([]);
  });

  it('adds only asleep minutes per night and merges overlapping sources', () => {
    const samples = mapHealthKitSamples({
      sleep: [
        { startDate: '2026-10-02T22:00:00.000Z', endDate: '2026-10-03T06:00:00.000Z', value: 0 }, // en cama
        { startDate: '2026-10-02T23:00:00.000Z', endDate: '2026-10-03T03:00:00.000Z', value: 3 }, // core
        { startDate: '2026-10-02T23:30:00.000Z', endDate: '2026-10-03T02:00:00.000Z', value: 1 }, // otra fuente, solapada
        { startDate: '2026-10-03T03:00:00.000Z', endDate: '2026-10-03T04:00:00.000Z', value: 2 }, // despierto
        { startDate: '2026-10-03T04:00:00.000Z', endDate: '2026-10-03T06:30:00.000Z', value: 5 }, // REM
      ],
    });

    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({
      kind: 'sleep',
      unit: 'min',
      value: 4 * 60 + 150,
      startedAt: '2026-10-02T23:00:00.000Z',
      endedAt: '2026-10-03T06:30:00.000Z',
      origin: 'health_kit',
    });
  });

  it('splits two nights and drops a night still in progress', () => {
    const samples = mapHealthKitSamples(
      {
        sleep: [
          { startDate: '2026-10-01T23:00:00.000Z', endDate: '2026-10-02T06:00:00.000Z', value: 3 },
          { startDate: '2026-10-02T23:00:00.000Z', endDate: '2026-10-03T07:30:00.000Z', value: 3 },
        ],
      },
      { sleepSettledBefore: '2026-10-03T07:00:00.000Z' },
    );
    expect(samples.map((item) => item.value)).toEqual([420]);
  });
});
