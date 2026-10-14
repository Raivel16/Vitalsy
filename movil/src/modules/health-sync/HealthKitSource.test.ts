import { HealthKitSource, type HealthKitModule } from './HealthKitSource';

function fakeModule(overrides: Partial<HealthKitModule> = {}): HealthKitModule & { calls: Array<{ id: string; options: any }> } {
  const calls: Array<{ id: string; options: any }> = [];
  const module: HealthKitModule = {
    isHealthDataAvailable: () => true,
    requestAuthorization: jest.fn(async () => true),
    queryQuantitySamples: jest.fn(async (id: string, options: any) => {
      calls.push({ id, options });
      if (id === 'HKQuantityTypeIdentifierHeartRate') {
        return [{ startDate: new Date('2026-10-03T08:00:00.000Z'), endDate: new Date('2026-10-03T08:00:00.000Z'), quantity: 61 }];
      }
      if (id === 'HKQuantityTypeIdentifierOxygenSaturation') {
        return [{ startDate: new Date('2026-10-03T08:00:00.000Z'), endDate: new Date('2026-10-03T08:00:00.000Z'), quantity: 0.98 }];
      }
      return [];
    }),
    queryCategorySamples: jest.fn(async (id: string, options: any) => {
      calls.push({ id, options });
      return [
        {
          startDate: new Date('2026-10-02T23:00:00.000Z'),
          endDate: new Date('2026-10-03T05:00:00.000Z'),
          value: 3,
        },
      ];
    }),
    ...overrides,
  };
  return Object.assign(module, { calls });
}

describe('HealthKitSource', () => {
  it('reports available when HealthKit has data on the device', async () => {
    const source = new HealthKitSource(() => fakeModule(), 'ios');
    expect((await source.availability()).state).toBe('available');
  });

  it('reports unavailable off iOS and when HealthKit is not available', async () => {
    expect((await new HealthKitSource(() => fakeModule(), 'android').availability()).state).toBe('unavailable');
    const none = fakeModule({ isHealthDataAvailable: () => false });
    expect((await new HealthKitSource(() => none, 'ios').availability()).state).toBe('unavailable');
  });

  it('requests read-only authorization and nothing to share', async () => {
    const module = fakeModule();
    const result = await new HealthKitSource(() => module, 'ios').requestAccess();
    expect(result.granted).toBe(true);
    const request = (module.requestAuthorization as jest.Mock).mock.calls[0][0];
    expect(request.toShare ?? []).toEqual([]);
    expect(request.toRead).toEqual(
      expect.arrayContaining([
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierBodyTemperature',
        'HKCategoryTypeIdentifierSleepAnalysis',
      ]),
    );
  });

  it('reads and maps the window as health_kit samples', async () => {
    const module = fakeModule();
    const source = new HealthKitSource(() => module, 'ios');
    const read = await source.readGranted(new Date('2026-10-03T00:00:00.000Z'), new Date('2026-10-03T12:00:00.000Z'));
    expect(read.failed).toBeFalsy();
    expect(read.samples.map((item) => [item.kind, item.value, item.origin])).toEqual([
      ['heart_rate', 61, 'health_kit'],
      ['spo2', 98, 'health_kit'],
      ['sleep', 360, 'health_kit'],
    ]);
    const heart = module.calls.find((call) => call.id === 'HKQuantityTypeIdentifierHeartRate')!;
    expect(heart.options.filter.date.startDate).toEqual(new Date('2026-10-03T00:00:00.000Z'));
    expect(heart.options.filter.date.endDate).toEqual(new Date('2026-10-03T12:00:00.000Z'));
  });

  it('marks the read as failed when every query throws', async () => {
    const module = fakeModule({
      queryQuantitySamples: jest.fn(async () => {
        throw new Error('denied');
      }),
      queryCategorySamples: jest.fn(async () => {
        throw new Error('denied');
      }),
    });
    const read = await new HealthKitSource(() => module, 'ios').readGranted(new Date(0), new Date());
    expect(read).toMatchObject({ samples: [], failed: true });
  });

  it('never throws when the native module is missing', async () => {
    const source = new HealthKitSource(() => null, 'ios');
    expect((await source.availability()).state).toBe('unavailable');
    expect((await source.requestAccess()).granted).toBe(false);
    expect(await source.readGranted(new Date(0), new Date())).toMatchObject({ samples: [], failed: true });
  });
});
