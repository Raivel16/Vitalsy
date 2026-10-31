import { createTokenStore, type SecureBackend } from '../../shared/api/tokenStore';
import { emptySnapshot, LifeApp } from '../life/lifeApp';
import { collectAndEnqueue } from './collectAndEnqueue';
import { mapHealthKitSamples } from './domain/mapHealthKitSamples';
import type { BiometricSample } from './domain/types';
import { HealthConnectSource, type HealthModule } from './HealthConnectSource';
import type { HealthDataSource } from './HealthDataSource';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const clock = { now: () => NOW, random: () => 'r', digest: async () => 'd' as never };

function sample(id: string, value = 60): BiometricSample {
  return { id, kind: 'heart_rate', value, unit: 'lpm', startedAt: NOW.toISOString(), endedAt: NOW.toISOString(), origin: 'health_connect' };
}

function fakeModule(readRecords: HealthModule['readRecords'], requestPermission = jest.fn(async () => [{}])): HealthModule {
  return {
    getSdkStatus: async () => 3,
    initialize: async () => true,
    requestPermission: requestPermission as never,
    readRecords,
    SdkAvailabilityStatus: { SDK_AVAILABLE: 3, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2 },
  };
}

const RANGE = [new Date('2026-10-01T00:00:00.000Z'), NOW] as const;

describe('HealthConnectSource read integrity', () => {
  it('initializes Health Connect before a silent read, without asking for permissions', async () => {
    const order: string[] = [];
    const requestPermission = jest.fn(async () => [{}]);
    const module: HealthModule = {
      ...fakeModule(async () => {
        order.push('read');
        return { records: [] };
      }, requestPermission),
      initialize: async () => {
        order.push('initialize');
        return true;
      },
    };
    const result = await new HealthConnectSource(async () => module, 'android').readGranted(...RANGE);
    expect(order[0]).toBe('initialize');
    expect(order).toContain('read');
    expect(requestPermission).not.toHaveBeenCalled();
    expect(result.failed).toBeUndefined();
  });

  it('reports a failed read, not an empty one, when Health Connect cannot start', async () => {
    const readRecords = jest.fn(async () => ({ records: [] }));
    const module: HealthModule = { ...fakeModule(readRecords), initialize: async () => false };
    const result = await new HealthConnectSource(async () => module, 'android').readGranted(...RANGE);
    expect(result.failed).toBe(true);
    expect(readRecords).not.toHaveBeenCalled();
  });

  it('marks the read failed when every record type throws (background permission missing)', async () => {
    const source = new HealthConnectSource(async () => fakeModule(async () => {
      throw new Error('SecurityException');
    }), 'android');
    const result = await source.readGranted(...RANGE);
    expect(result.failed).toBe(true);
    expect(result.samples).toEqual([]);
  });

  it('does not report success when one required type fails', async () => {
    const source = new HealthConnectSource(async () => fakeModule(async (type) => {
      if (type === 'OxygenSaturation') {
        throw new Error('denied');
      }
      return { records: type === 'HeartRate' ? [{ startTime: NOW.toISOString(), endTime: NOW.toISOString(), samples: [{ time: NOW.toISOString(), beatsPerMinute: 70 }] }] : [] };
    }), 'android');
    const result = await source.readGranted(...RANGE);
    expect(result.failed).toBe(true);
    expect(result.samples.map((item) => item.kind)).toEqual(['heart_rate']);
  });

  it('tolerates the optional skin temperature type failing on its own', async () => {
    const source = new HealthConnectSource(async () => fakeModule(async (type) => {
      if (type === 'SkinTemperature') {
        throw new Error('unsupported');
      }
      return { records: [] };
    }), 'android');
    const result = await source.readGranted(...RANGE);
    expect(result.failed).toBeUndefined();
  });

  it('follows pageToken and merges every page', async () => {
    const calls: Array<string | undefined> = [];
    const source = new HealthConnectSource(async () => fakeModule(async (type, options) => {
      if (type !== 'HeartRate') {
        return { records: [] };
      }
      calls.push(options.pageToken);
      if (!options.pageToken) {
        return { records: [{ startTime: '2026-10-11T10:00:00.000Z', endTime: '2026-10-11T10:00:00.000Z', samples: [{ time: '2026-10-11T10:00:00.000Z', beatsPerMinute: 60 }] }], pageToken: 'p2' };
      }
      return { records: [{ startTime: '2026-10-11T11:00:00.000Z', endTime: '2026-10-11T11:00:00.000Z', samples: [{ time: '2026-10-11T11:00:00.000Z', beatsPerMinute: 61 }] }] };
    }), 'android');
    const result = await source.readGranted(...RANGE);
    expect(calls).toEqual([undefined, 'p2']);
    expect(result.samples.map((item) => item.value)).toEqual([60, 61]);
    expect(result.failed).toBeUndefined();
  });

  it('treats a never-ending page chain as an incomplete (failed) read', async () => {
    const source = new HealthConnectSource(async () => fakeModule(async () => ({ records: [], pageToken: 'again' })), 'android');
    const result = await source.readGranted(...RANGE);
    expect(result.failed).toBe(true);
  });

  it('asks for the background permission only when told to', async () => {
    const requestPermission = jest.fn(async () => [{}]);
    const source = new HealthConnectSource(async () => fakeModule(async () => ({ records: [] }), requestPermission), 'android');
    await source.requestAccess();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    await source.requestAccess({ includeBackground: true });
    expect(requestPermission).toHaveBeenCalledTimes(3);
    expect(requestPermission.mock.calls[2][0]).toEqual([{ accessType: 'read', recordType: 'BackgroundAccessPermission' }]);
  });
});

describe('collectAndEnqueue read integrity', () => {
  function source(readSamples: BiometricSample[], failed: boolean): HealthDataSource & { backgroundAsks: boolean[] } {
    const result = {
      name: 'fake',
      backgroundAsks: [] as boolean[],
      availability: async () => ({ state: 'available' as const, message: 'ok' }),
      requestAccess: async (options?: { includeBackground?: boolean }) => {
        result.backgroundAsks.push(Boolean(options?.includeBackground));
        return { granted: true, message: 'ok' };
      },
      readRange: async () => ({ samples: readSamples, message: null, failed }),
      readGranted: async () => ({ samples: readSamples, message: null, failed }),
    };
    return result;
  }

  it('does not advance lastReadAt when the read failed, so the window is read again', async () => {
    const life = new LifeApp({ ...emptySnapshot(), sessionUserId: '7' }, clock);
    await collectAndEnqueue({ source: source([], true), life, now: () => NOW, interactive: true });
    expect(life.state.healthSync.lastReadAt).toBeNull();
  });

  it('requests the background permission at most once', async () => {
    const life = new LifeApp({ ...emptySnapshot(), sessionUserId: '7' }, clock);
    const fake = source([], false);
    await collectAndEnqueue({ source: fake, life, now: () => NOW, interactive: true });
    await collectAndEnqueue({ source: fake, life, now: () => NOW, interactive: true });
    expect(fake.backgroundAsks).toEqual([true, false]);
  });
});

describe('per-account health state', () => {
  const account = (id: number) => ({ id, name: 'N', email: `n${id}@correo.test` });

  it('is reset on logout', () => {
    const life = new LifeApp(emptySnapshot(), clock);
    life.openServerSession(account(7));
    life.markHealthAccess(true);
    life.recordHealthRead(NOW.toISOString());
    life.markBackgroundAccessRequested();
    life.logout();
    expect(life.state.healthSync).toEqual({ accessGranted: false, lastReadAt: null, backgroundAccessRequested: false });
  });

  it('does not carry over to a different account', () => {
    const life = new LifeApp(emptySnapshot(), clock);
    life.openServerSession(account(7));
    life.markHealthAccess(true);
    life.recordHealthRead(NOW.toISOString());
    life.openServerSession(account(8), { confirmed: true });
    expect(life.state.sessionUserId).toBe('8');
    expect(life.state.healthSync).toEqual({ accessGranted: false, lastReadAt: null, backgroundAccessRequested: false });
  });
});

describe('sample replacement', () => {
  it('replaces a sample whose value changed under the same id instead of duplicating it', () => {
    const life = new LifeApp(emptySnapshot(), clock);
    life.addSamples([sample('hk:sleep:2026-10-12', 300)]);
    expect(life.addSamples([sample('hk:sleep:2026-10-12', 300)])).toBe(0);
    expect(life.addSamples([sample('hk:sleep:2026-10-12', 420)])).toBe(1);
    expect(life.state.samples.filter((item) => item.id === 'hk:sleep:2026-10-12').map((item) => item.value)).toEqual([420]);
  });

  it('keeps one stable HealthKit sleep id per night even when the night grows', () => {
    const early = mapHealthKitSamples({ sleep: [{ startDate: '2026-10-11T23:00:00.000Z', endDate: '2026-10-12T04:00:00.000Z', value: 3 }] });
    const grown = mapHealthKitSamples({ sleep: [{ startDate: '2026-10-11T23:00:00.000Z', endDate: '2026-10-12T07:00:00.000Z', value: 3 }] });
    expect(early[0].id).toBe(grown[0].id);
    expect(early[0].value).not.toBe(grown[0].value);
  });
});

describe('token store account binding', () => {
  function backend(): SecureBackend & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      getItemAsync: async (key) => data.get(key) ?? null,
      setItemAsync: async (key, value) => void data.set(key, value),
      deleteItemAsync: async (key) => void data.delete(key),
    };
  }

  it('stores the token with its account and exposes the token alone through get()', async () => {
    const store = createTokenStore(backend());
    await store.set('tok', '7');
    expect(await store.getBinding()).toEqual({ token: 'tok', accountId: '7' });
    expect(await store.get()).toBe('tok');
  });

  it('reads a legacy raw token as unbound', async () => {
    const raw = backend();
    raw.data.set('vitalsy.life.token', 'legacy-token');
    const store = createTokenStore(raw);
    expect(await store.getBinding()).toEqual({ token: 'legacy-token', accountId: null });
  });

  it('persists the transition mark and clears it', async () => {
    const raw = backend();
    const store = createTokenStore(raw);
    await store.setTransition(true);
    expect(await createTokenStore(raw).isTransitioning()).toBe(true);
    await store.setTransition(false);
    expect(await store.isTransitioning()).toBe(false);
  });
});
