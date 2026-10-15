import type { SecureBackend } from '../../shared/api/tokenStore';
import { createTokenStore } from '../../shared/api/tokenStore';
import { SqlitePersistence } from '../../shared/storage/sqlitePersistence';
import { mapHealthKitSamples } from '../health-sync/domain/mapHealthKitSamples';
import { grantSharing, issueServerLinkCode } from './consentSync';
import { emptySnapshot, LifeApp } from './lifeApp';
import { reconcileSessionStartup } from './sessionStartup';
import { runSync } from './syncRunner';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const clock = { now: () => NOW, random: () => 'r', digest: async () => 'd' as never };
const account = (id: number) => ({ id, name: 'N', email: `n${id}@correo.test` });

function backend(): SecureBackend & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

function serverLife(id = 7): LifeApp {
  const life = new LifeApp(emptySnapshot(), clock);
  life.openServerSession(account(id));
  return life;
}

describe('startup reconciliation', () => {
  it('rebinds a legacy raw token to the server account of the snapshot', async () => {
    const raw = backend();
    raw.data.set('vitalsy.life.token', 'legacy');
    const tokenStore = createTokenStore(raw);
    await reconcileSessionStartup({ life: serverLife(7), tokenStore });
    expect(await tokenStore.getBinding()).toEqual({ token: 'legacy', accountId: '7' });
  });

  it('leaves the token unbound when the snapshot has no server session', async () => {
    const raw = backend();
    raw.data.set('vitalsy.life.token', 'legacy');
    const tokenStore = createTokenStore(raw);
    await reconcileSessionStartup({ life: new LifeApp(emptySnapshot(), clock), tokenStore });
    expect(await tokenStore.getBinding()).toEqual({ token: 'legacy', accountId: null });
  });

  it('clears a stale transition mark when this runtime is not changing session', async () => {
    const tokenStore = createTokenStore(backend());
    await tokenStore.set('t', '7');
    await tokenStore.setTransition(true);
    await reconcileSessionStartup({ life: serverLife(7), tokenStore });
    expect(await tokenStore.isTransitioning()).toBe(false);
  });

  it('keeps the mark while a session change is in progress here', async () => {
    const tokenStore = createTokenStore(backend());
    await tokenStore.setTransition(true);
    const life = serverLife(7);
    life.beginSessionChange();
    await reconcileSessionStartup({ life, tokenStore });
    expect(await tokenStore.isTransitioning()).toBe(true);
  });
});

describe('HealthKit sleep ids', () => {
  const NAP = { startDate: '2026-10-12T10:00:00.000Z', endDate: '2026-10-12T11:00:00.000Z', value: 1 };
  const NIGHT = { startDate: '2026-10-11T23:00:00.000Z', endDate: '2026-10-12T07:00:00.000Z', value: 3 };

  it('gives a morning nap and the night ending the same UTC date different ids', () => {
    const ids = mapHealthKitSamples({ sleep: [NIGHT, NAP] }).map((item) => item.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('replaces an extended night instead of duplicating it', () => {
    const life = new LifeApp(emptySnapshot(), clock);
    life.addSamples(mapHealthKitSamples({ sleep: [{ ...NIGHT, endDate: '2026-10-12T05:00:00.000Z' }] }));
    life.addSamples(mapHealthKitSamples({ sleep: [NIGHT] }));
    life.addSamples(mapHealthKitSamples({ sleep: [NIGHT] }));
    const sleeps = life.state.samples.filter((item) => item.kind === 'sleep');
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0].value).toBe(480);
  });
});

describe('epoch guards', () => {
  it('discards notices pulled while the session changed', async () => {
    const life = serverLife(7);
    const getNotices = jest.fn(async () => {
      life.beginSessionChange();
      life.endSessionChange();
      return {
        ok: true as const,
        data: { notices: [{ id: 'n1', kind: 'habito', title: 't', body: 'b', createdAt: NOW.toISOString() }] },
      };
    });
    const client = { sync: jest.fn(), getNotices, setConsent: jest.fn(), issueLinkCode: jest.fn() } as never;
    await runSync({ life, client, online: true, hasSession: true, onUnauthorized: async () => undefined });
    expect(getNotices).toHaveBeenCalled();
    expect(life.state.notices).toEqual([]);
  });

  it('does not confirm sharing if the session changed during grant', async () => {
    const life = serverLife(7);
    const client = {
      setConsent: jest.fn(async () => {
        life.beginSessionChange();
        life.endSessionChange();
        return { ok: true as const, data: { sharingEnabled: true } };
      }),
      issueLinkCode: jest.fn(),
    };
    const outcome = await grantSharing({ life, client: client as never, hasSession: true, online: true, onUnauthorized: async () => undefined });
    expect(outcome.ok).toBe(false);
    expect(life.state.consent.sharingEnabled).toBe(false);
  });

  it('does not store a link code issued while the session changed', async () => {
    const life = serverLife(7);
    life.confirmSharing();
    const client = {
      setConsent: jest.fn(),
      issueLinkCode: jest.fn(async () => {
        life.beginSessionChange();
        life.endSessionChange();
        return { ok: true as const, data: { code: 'ABC123', expiresAt: '2026-10-12T12:30:00.000Z' } };
      }),
    };
    const outcome = await issueServerLinkCode({ life, client: client as never, hasSession: true, online: true, onUnauthorized: async () => undefined });
    expect(outcome.ok).toBe(false);
    expect(life.state.consent.linkingCode).toBeNull();
  });
});

describe('SqlitePersistence.update (fake database)', () => {
  const key = new Uint8Array(32).fill(7);
  const nonce = () => new Uint8Array(12).fill(1);

  function fakeDatabase(options: { busyOnce?: boolean } = {}) {
    let payload: string | null = null;
    let busy = options.busyOnce ?? false;
    const transaction = {
      getFirstAsync: async () => (payload ? { payload } : null),
      runAsync: async (_sql: string, value: string) => {
        payload = value;
      },
    };
    return {
      execAsync: async () => undefined,
      getFirstAsync: async () => (payload ? { payload } : null),
      runAsync: async (_sql: string, value: string) => {
        payload = value;
      },
      withExclusiveTransactionAsync: async (task: (txn: typeof transaction) => Promise<void>) => {
        if (busy) {
          busy = false;
          throw new Error('database is locked');
        }
        await task(transaction);
      },
    };
  }

  it('passes the latest stored value to the mutator and writes the result', async () => {
    const store = await SqlitePersistence.open(fakeDatabase() as never, key, nonce);
    await store.save({ ...emptySnapshot(), sessionUserId: '7' });
    await store.update((current) => ({ ...current!, consentRevokePending: true }));
    expect((await store.load())?.consentRevokePending).toBe(true);
  });

  it('writes nothing when the mutator returns null', async () => {
    const store = await SqlitePersistence.open(fakeDatabase() as never, key, nonce);
    await store.update(() => null);
    expect(await store.load()).toBeNull();
  });

  it('retries once when the database is busy', async () => {
    const store = await SqlitePersistence.open(fakeDatabase({ busyOnce: true }) as never, key, nonce);
    await store.update(() => ({ ...emptySnapshot(), sessionUserId: '9' }));
    expect((await store.load())?.sessionUserId).toBe('9');
  });
});
