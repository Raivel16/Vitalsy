import type { LifeClient } from '../../shared/api/lifeClient';
import type { LifePersistence } from '../../shared/storage/persistence';
import { emptySnapshot, LifeApp, type LifeSnapshot } from '../life/lifeApp';
import { clearForegroundRuntime, runBackgroundHealthSync, setForegroundRuntime, type BackgroundSyncDeps } from './backgroundSync';
import type { BiometricSample } from './domain/types';
import type { HealthDataSource } from './HealthDataSource';

const NOW = new Date('2026-10-12T12:00:00.000Z');

function sample(id: string): BiometricSample {
  return { id, kind: 'heart_rate', value: 60, unit: 'lpm', startedAt: NOW.toISOString(), endedAt: NOW.toISOString(), origin: 'health_connect' };
}

function snapshot(patch: Partial<LifeSnapshot> = {}): LifeSnapshot {
  return { ...emptySnapshot(), sessionUserId: '7', healthSync: { accessGranted: true, lastReadAt: null }, ...patch };
}

function setup(options: {
  snapshot?: LifeSnapshot | null;
  token?: string | null;
  client?: LifeClient | null;
  samples?: BiometricSample[];
  online?: boolean;
}) {
  const reads: Array<[Date, Date]> = [];
  const source: HealthDataSource = {
    name: 'fake',
    availability: async () => ({ state: 'available', message: 'ok' }),
    requestAccess: async () => {
      throw new Error('background must never prompt');
    },
    readRange: async () => ({ samples: [], message: null }),
    readGranted: async (from, to) => {
      reads.push([from, to]);
      return { samples: options.samples ?? [], message: null };
    },
  };
  let stored: LifeSnapshot | null = options.snapshot === undefined ? snapshot() : options.snapshot;
  const persistence: LifePersistence & { saves: number } = {
    saves: 0,
    load: async () => stored,
    save: async (next) => {
      persistence.saves += 1;
      stored = next;
    },
  };
  const sync = jest.fn(async () => ({ ok: true, status: 200, data: { accepted: [] as string[], rejected: [] } }));
  const client = (options.client === undefined ? { sync, getNotices: jest.fn(async () => ({ ok: false, status: 500 })) } : options.client) as never;
  const cleared = jest.fn(async () => undefined);
  const deps: BackgroundSyncDeps = {
    source,
    persistence,
    tokenStore: { get: async () => (options.token === undefined ? 'tok' : options.token), clear: cleared },
    client,
    now: () => NOW,
    isOnline: async () => options.online ?? true,
    createLife: (initial) => new LifeApp(initial, { now: () => NOW, random: () => 'r', digest: async () => 'd' as never }),
  };
  return { deps, reads, persistence, sync, getStored: () => stored };
}

afterEach(() => clearForegroundRuntime());

describe('runBackgroundHealthSync', () => {
  it('is a no-op without a session token', async () => {
    const { deps, reads, sync } = setup({ token: null, samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
    expect(sync).not.toHaveBeenCalled();
  });

  it('is a no-op when the API is not configured', async () => {
    const { deps, reads } = setup({ client: null });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
  });

  it('is a no-op without health permission', async () => {
    const { deps, reads, persistence } = setup({ snapshot: snapshot({ healthSync: { accessGranted: false, lastReadAt: null } }) });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
    expect(persistence.saves).toBe(0);
  });

  it('is a no-op when nothing was ever persisted', async () => {
    const { deps } = setup({ snapshot: null });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
  });

  it('is a no-op when the account has no open session in the snapshot', async () => {
    const { deps } = setup({ snapshot: snapshot({ sessionUserId: null }) });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
  });

  it('reads the first window capped to 14 days, enqueues, persists and syncs', async () => {
    const { deps, reads, persistence, sync, getStored } = setup({ samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('success');

    expect(NOW.getTime() - reads[0][0].getTime()).toBe(14 * 24 * 60 * 60 * 1000);
    expect(persistence.saves).toBeGreaterThan(0);
    expect(getStored()?.samples.map((item) => item.id)).toContain('a');
    expect(getStored()?.healthSync.lastReadAt).toBe(NOW.toISOString());
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('reads only deltas on the next run', async () => {
    const { deps, reads } = setup({
      snapshot: snapshot({ healthSync: { accessGranted: true, lastReadAt: '2026-10-12T11:30:00.000Z' } }),
    });
    await runBackgroundHealthSync(deps);
    expect(reads[0][0].getTime()).toBeGreaterThan(Date.parse('2026-10-12T05:00:00.000Z'));
    expect(reads[0][0].getTime()).toBeLessThan(Date.parse('2026-10-12T11:30:00.000Z'));
  });

  it('keeps samples queued and skips the network when offline', async () => {
    const { deps, sync, getStored } = setup({ samples: [sample('a')], online: false });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('success');
    expect(sync).not.toHaveBeenCalled();
    expect(getStored()?.queue.some((item) => item.status === 'pending')).toBe(true);
  });

  it('reuses the in-memory app when the UI runtime is alive instead of overwriting it from disk', async () => {
    const { deps, persistence } = setup({ samples: [sample('live')] });
    const life = deps.createLife(snapshot());
    const persist = jest.fn(async () => undefined);
    const notify = jest.fn();
    setForegroundRuntime({ life, persist, notify });

    await runBackgroundHealthSync(deps);

    expect(life.state.samples.map((item) => item.id)).toContain('live');
    expect(persist).toHaveBeenCalled();
    expect(notify).toHaveBeenCalled();
    expect(persistence.saves).toBe(0);
  });

  it('never throws: a failing source ends as failed', async () => {
    const { deps } = setup({});
    deps.source = {
      ...deps.source,
      availability: async () => {
        throw new Error('boom');
      },
    };
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('failed');
  });
});
