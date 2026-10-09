import { mapHealthConnectRecords } from './mapHealthRecords';

describe('mapHealthConnectRecords', () => {
  it('maps heart rate, oxygen, steps and sleep into internal samples', () => {
    const samples = mapHealthConnectRecords({
      heartRate: [
        {
          startTime: '2026-10-03T08:00:00.000Z',
          endTime: '2026-10-03T08:01:00.000Z',
          samples: [{ time: '2026-10-03T08:00:00.000Z', beatsPerMinute: 64 }],
        },
      ],
      oxygenSaturation: [{ time: '2026-10-03T08:00:00.000Z', percentage: 98 }],
      steps: [{ startTime: '2026-10-03T00:00:00.000Z', endTime: '2026-10-03T12:00:00.000Z', count: 5420 }],
      sleep: [{ startTime: '2026-10-02T23:00:00.000Z', endTime: '2026-10-03T06:45:00.000Z' }],
    });

    expect(samples.map((item) => item.kind)).toEqual(['heart_rate', 'spo2', 'steps', 'sleep']);
    expect(samples[0]).toMatchObject({ value: 64, unit: 'lpm', origin: 'health_connect' });
    expect(samples[3].value).toBe(465);
  });

  it('returns an empty list when Health Connect has no records', () => {
    expect(mapHealthConnectRecords({})).toEqual([]);
  });

  it('keeps temperature only when a record is present', () => {
    const samples = mapHealthConnectRecords({
      skinTemperature: [{ time: '2026-10-03T07:00:00.000Z', celsius: 33.4 }],
    });
    expect(samples).toHaveLength(1);
    expect(samples[0].kind).toBe('skin_temperature');
  });
});
