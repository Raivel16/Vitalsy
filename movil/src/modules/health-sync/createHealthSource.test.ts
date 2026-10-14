import { createHealthSource } from './createHealthSource';
import { HealthConnectSource } from './HealthConnectSource';
import { HealthKitSource } from './HealthKitSource';

describe('createHealthSource', () => {
  it('picks Health Connect on Android and keeps it untouched', () => {
    expect(createHealthSource({ os: 'android' })).toBeInstanceOf(HealthConnectSource);
  });

  it('picks HealthKit on iOS when the native module is present', () => {
    const source = createHealthSource({ os: 'ios', loadHealthKit: () => ({}) as never });
    expect(source).toBeInstanceOf(HealthKitSource);
  });

  it('falls back to an honest unavailable source on iOS without the native module (Expo Go)', async () => {
    const source = createHealthSource({ os: 'ios', loadHealthKit: () => null });
    expect(source.name).toBe('Apple Health');
    await expect(source.availability()).resolves.toEqual({
      state: 'unavailable',
      message: 'Requiere un development build en un iPhone.',
    });
    await expect(source.readRange(new Date(), new Date())).resolves.toMatchObject({ samples: [] });
  });

  it('does not throw at import or creation time when requiring the library fails', () => {
    expect(() =>
      createHealthSource({
        os: 'ios',
        loadHealthKit: () => {
          throw new Error('Cannot find module');
        },
      }),
    ).not.toThrow();
  });

  it('is unavailable on web and other platforms', async () => {
    const source = createHealthSource({ os: 'web' });
    expect((await source.availability()).state).toBe('unavailable');
  });
});
