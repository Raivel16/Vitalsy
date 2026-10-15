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
  return {
    ...emptySnapshot(),
    sessionUserId: '7',
    healthSync: { accessGranted: true, lastReadAt: null, backgroundAccessRequested: false },
    ...patch,
  };
}

function setup(options: {
  snapshot?: LifeSnapshot | null;
  token?: string | null;
  accountId?: string | null;
  transitioning?: boolean;
  client?: LifeClient | null;
  samples?: BiometricSample[];
  online?: boolean;
  /** Se ejecuta entre la lectura y la escritura de la tarea: simula a la app guardando a la vez. */
  concurrentWrite?: (current: LifeSnapshot) => LifeSnapshot;
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
  let injected = false;
  const persistence: LifePersistence & { saves: number; updates: number } = {
    saves: 0,
    updates: 0,
    load: async () => stored,
    save: async (next) => {
      persistence.saves += 1;
      stored = next;
    },
    update: async (mutate) => {
      persistence.updates += 1;
      if (options.concurrentWrite && !injected && stored) {
        // La app escribe justo antes de que la tarea confirme: la tarea debe ver ese cambio.
        injected = true;
        stored = options.concurrentWrite(stored);
      }
      const next = mutate(stored);
      if (next) {
        stored = next;
      }
    },
  };
  const sync = jest.fn(async (items: Array<{ id: string }>) => ({
    ok: true,
    status: 200,
    data: { accepted: items.map((item) => item.id), rejected: [] as Array<{ id: string; reason: string }> },
  }));
  const client = (options.client === undefined ? { sync, getNotices: jest.fn(async () => ({ ok: false, status: 500 })) } : options.client) as never;
  const cleared = jest.fn(async () => undefined);
  const token = options.token === undefined ? 'tok' : options.token;
  const accountId = options.accountId === undefined ? '7' : options.accountId;
  const deps: BackgroundSyncDeps = {
    source,
    persistence,
    tokenStore: {
      getBinding: async () => (token ? { token, accountId } : null),
      isTransitioning: async () => options.transitioning ?? false,
      clear: cleared,
    },
    client,
    now: () => NOW,
    isOnline: async () => options.online ?? true,
    createLife: (initial) => new LifeApp(initial, { now: () => NOW, random: () => 'r', digest: async () => 'd' as never }),
  };
  return { deps, reads, persistence, sync, getStored: () => stored, setStored: (next: LifeSnapshot) => void (stored = next) };
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
    const { deps, reads, persistence } = setup({
      snapshot: snapshot({ healthSync: { accessGranted: false, lastReadAt: null, backgroundAccessRequested: false } }),
    });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
    expect(persistence.saves + persistence.updates).toBe(0);
  });

  it('is a no-op when nothing was ever persisted', async () => {
    const { deps } = setup({ snapshot: null });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
  });

  it('is a no-op when the account has no open session in the snapshot', async () => {
    const { deps } = setup({ snapshot: snapshot({ sessionUserId: null }) });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
  });

  it('cold run with a token of another account than the snapshot reads, enqueues and sends nothing', async () => {
    const { deps, reads, sync, persistence, getStored } = setup({ accountId: '9', samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
    expect(sync).not.toHaveBeenCalled();
    expect(persistence.updates + persistence.saves).toBe(0);
    expect(getStored()?.samples).toEqual([]);
  });

  it('is a no-op for a legacy token without a bound account', async () => {
    const { deps, reads, sync } = setup({ accountId: null, samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
    expect(sync).not.toHaveBeenCalled();
  });

  it('is a no-op while a session change is marked as in progress (app killed mid-switch)', async () => {
    const { deps, reads, sync } = setup({ transitioning: true, samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
    expect(sync).not.toHaveBeenCalled();
  });

  it('works when token account, snapshot account and no transition all agree', async () => {
    const { deps, sync } = setup({ samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('success');
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('reads the first window capped to 14 days, enqueues, persists and syncs', async () => {
    const { deps, reads, sync, getStored } = setup({ samples: [sample('a')] });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('success');

    expect(NOW.getTime() - reads[0][0].getTime()).toBe(14 * 24 * 60 * 60 * 1000);
    expect(getStored()?.samples.map((item) => item.id)).toContain('a');
    expect(getStored()?.healthSync.lastReadAt).toBe(NOW.toISOString());
    expect(sync).toHaveBeenCalledTimes(1);
    expect(getStored()?.queue.every((item) => item.status === 'synced')).toBe(true);
  });

  it('reads only deltas on the next run', async () => {
    const { deps, reads } = setup({
      snapshot: snapshot({ healthSync: { accessGranted: true, lastReadAt: '2026-10-12T11:30:00.000Z', backgroundAccessRequested: false } }),
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

  it('does not overwrite a newer snapshot: a queue item and a pending revoke written by the app meanwhile survive', async () => {
    const appItem = { id: 'plan-1', kind: 'plan' as const, body: '{}', status: 'pending' as const, attempts: 0 };
    const { deps, getStored } = setup({
      samples: [sample('a')],
      online: false,
      concurrentWrite: (current) => ({
        ...current,
        queue: [...current.queue, appItem as never],
        pendingRevokes: [{ accountId: '7', pendingSince: NOW.toISOString() }],
        consentRevokePending: true,
      }),
    });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('success');
    const result = getStored()!;
    expect(result.queue.map((item) => item.id)).toContain('plan-1');
    expect(result.pendingRevokes).toEqual([{ accountId: '7', pendingSince: NOW.toISOString() }]);
    expect(result.consentRevokePending).toBe(true);
    expect(result.samples.map((item) => item.id)).toContain('a');
  });

  it('stops sending the remaining chunks when the app sets a revocation between chunks', async () => {
    const queue = Array.from({ length: 250 }, (_, index) => ({
      id: `plan-${index}`,
      kind: 'plan' as const,
      body: '{}',
      status: 'pending' as const,
    }));
    const harness = setup({ snapshot: snapshot({ queue }) });
    let calls = 0;
    const racing = jest.fn(async (items: Array<{ id: string }>) => {
      calls += 1;
      if (calls === 1) {
        harness.setStored({ ...harness.getStored()!, consentRevokePending: true });
      }
      return { ok: true, status: 200, data: { accepted: items.map((item) => item.id), rejected: [] } };
    });
    harness.deps.client = { sync: racing, getNotices: jest.fn() } as never;
    await runBackgroundHealthSync(harness.deps);
    expect(racing).toHaveBeenCalledTimes(1);
    const after = harness.getStored()!;
    expect(after.consentRevokePending).toBe(true);
    expect(after.queue.filter((item) => item.status === 'pending')).toHaveLength(150);
  });

  it('does not send biometrics while a revocation is pending', async () => {
    const { deps, sync } = setup({
      snapshot: snapshot({ consentRevokePending: true }),
      samples: [sample('a')],
    });
    await runBackgroundHealthSync(deps);
    expect(sync).not.toHaveBeenCalled();
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
    expect(persistence.saves + persistence.updates).toBe(0);
  });

  it('in the live runtime also refuses a token that belongs to another account', async () => {
    const { deps, reads } = setup({ accountId: '9', samples: [sample('live')] });
    const life = deps.createLife(snapshot());
    setForegroundRuntime({ life, persist: async () => undefined });
    await expect(runBackgroundHealthSync(deps)).resolves.toBe('noop');
    expect(reads).toHaveLength(0);
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
