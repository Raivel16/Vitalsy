import { createHash } from 'crypto';
import type { LifeClient } from '../../shared/api/lifeClient';
import { activatePlan } from './activatePlan';
import { emptySnapshot, LifeApp } from './lifeApp';
import { needsResync, runSync } from './syncRunner';

const clock = {
  now: () => new Date('2026-10-03T12:00:00.000Z'),
  random: () => 'salt-abcd1234',
  digest: (value: string) => createHash('sha256').update(value).digest('hex'),
};

function app(pending = 0) {
  const queue = Array.from({ length: pending }, (_, index) => ({
    id: `i${index}`,
    kind: 'biometrics' as const,
    body: '[]',
    status: 'pending' as const,
  }));
  return new LifeApp({ ...emptySnapshot(), queue }, clock);
}

const noop = async () => undefined;

describe('runSync', () => {
  it('applies earlier chunks even when a later one throws', async () => {
    const life = app(150);
    const sync = jest
      .fn()
      .mockImplementationOnce(async (chunk: { id: string }[]) => ({ ok: true, data: { accepted: chunk.map((i) => i.id), rejected: [] } }))
      .mockImplementationOnce(async () => {
        throw new Error('boom');
      });
    await runSync({ life, client: { sync } as unknown as LifeClient, online: true, hasSession: true, onUnauthorized: noop });
    expect(life.pendingSyncCount()).toBe(50);
    expect(life.state.lastServerSyncAt).not.toBeNull();
  });

  it('keeps items pending on a failure and clears the session on 401', async () => {
    const life = app(3);
    const unauthorized = jest.fn(async () => undefined);
    const sync = jest.fn(async () => ({ ok: false, status: 401, message: 'x' }));
    await runSync({ life, client: { sync } as unknown as LifeClient, online: true, hasSession: true, onUnauthorized: unauthorized });
    expect(unauthorized).toHaveBeenCalled();
    expect(life.pendingSyncCount()).toBe(3);
    expect(life.state.lastServerSyncAt).toBeNull();
  });

  it('does not send without a session', async () => {
    const life = app(2);
    const sync = jest.fn();
    await runSync({ life, client: { sync } as unknown as LifeClient, online: true, hasSession: false, onUnauthorized: noop });
    expect(sync).not.toHaveBeenCalled();
    expect(life.pendingSyncCount()).toBe(2);
  });
});

describe('runSync consent and notices', () => {
  const okSync = jest.fn(async (chunk: { id: string }[]) => ({ ok: true, data: { accepted: chunk.map((i) => i.id), rejected: [] } }));

  it('retries a pending revoke even when the queue is empty', async () => {
    const life = app();
    life.confirmSharing();
    life.revokeSharing(true);
    const setConsent = jest.fn(async () => ({ ok: true, data: { sharingEnabled: false, revokedAt: 'x' } }));
    await runSync({ life, client: { sync: okSync, setConsent } as unknown as LifeClient, online: true, hasSession: true, onUnauthorized: noop });
    expect(setConsent).toHaveBeenCalledWith(false);
    expect(life.state.consentRevokePending).toBe(false);
  });

  it('keeps the revoke pending when offline', async () => {
    const life = app();
    life.confirmSharing();
    life.revokeSharing(true);
    const setConsent = jest.fn();
    await runSync({ life, client: { sync: okSync, setConsent } as unknown as LifeClient, online: false, hasSession: true, onUnauthorized: noop });
    expect(setConsent).not.toHaveBeenCalled();
    expect(life.state.consentRevokePending).toBe(true);
  });

  it('pulls server notices and merges them without duplicating', async () => {
    const life = app();
    const notice = { id: 's1', kind: 'habito', title: 'Camina', body: 'Un paseo corto', metric: null, createdAt: '2026-10-03T08:00:00.000Z' };
    const getNotices = jest.fn(async () => ({ ok: true, data: { notices: [notice] } }));
    const client = { sync: okSync, getNotices } as unknown as LifeClient;
    await runSync({ life, client, online: true, hasSession: true, onUnauthorized: noop });
    await runSync({ life, client, online: true, hasSession: true, onUnauthorized: noop });
    expect(life.state.notices.map((n) => n.id)).toEqual(['s1']);
  });

  it('does not pull notices without a session and survives a failing pull', async () => {
    const life = app();
    const getNotices = jest.fn(async () => {
      throw new Error('boom');
    });
    const client = { sync: okSync, getNotices } as unknown as LifeClient;
    await runSync({ life, client, online: true, hasSession: false, onUnauthorized: noop });
    expect(getNotices).not.toHaveBeenCalled();
    await expect(runSync({ life, client, online: true, hasSession: true, onUnauthorized: noop })).resolves.toBeUndefined();
  });
});

describe('activatePlan', () => {
  const plan = JSON.stringify({ medications: [{ name: 'Paracetamol', dose: '1 g', schedule: '08:00' }], homeCare: ['Reposo'] });
  const clientWith = (fetchDischargePlan: jest.Mock) => ({ fetchDischargePlan }) as unknown as LifeClient;

  it('activates a JSON QR locally without session or server', async () => {
    const fetchPlan = jest.fn();
    const result = await activatePlan(plan, { life: app(), client: clientWith(fetchPlan), hasSession: false, onUnauthorized: noop });
    expect(result.ok).toBe(true);
    expect(fetchPlan).not.toHaveBeenCalled();
  });

  it('asks for login when an opaque code has no session', async () => {
    const fetchPlan = jest.fn();
    const result = await activatePlan('ALTA-1', { life: app(), client: clientWith(fetchPlan), hasSession: false, onUnauthorized: noop });
    expect(result).toEqual({ ok: false, message: 'Inicia sesión para activar tu plan de seguimiento.' });
    expect(fetchPlan).not.toHaveBeenCalled();
  });

  it('explains not found, claimed, offline and generic failures', async () => {
    const run = (reply: unknown) =>
      activatePlan('ALTA-1', { life: app(), client: clientWith(jest.fn(async () => reply)), hasSession: true, onUnauthorized: noop });
    expect(await run({ ok: false, status: 404, code: 'plan_not_found', message: 'x' })).toEqual({
      ok: false,
      message: 'No reconocemos ese código de alta. Revisa la hoja de alta.',
    });
    expect(await run({ ok: false, status: 409, code: 'plan_claimed', message: 'x' })).toEqual({
      ok: false,
      message: 'Este plan ya fue activado en otra cuenta.',
    });
    expect(await run({ ok: false, status: 0, message: 'Sin conexión' })).toEqual({
      ok: false,
      message: 'Sin conexión. Conéctate para activar tu plan.',
    });
    expect((await run({ ok: false, status: 500, message: 'x' })).ok).toBe(false);
  });

  it('activates from the server plan body', async () => {
    const life = app();
    const result = await activatePlan('ALTA-1', {
      life,
      client: clientWith(jest.fn(async () => ({ ok: true, data: plan }))),
      hasSession: true,
      onUnauthorized: noop,
    });
    expect(result.ok).toBe(true);
    expect(life.state.plan).not.toBeNull();
  });
});

describe('needsResync', () => {
  it('re-runs once only when connectivity came back while the run was in flight', () => {
    expect(needsResync(false, true)).toBe(true);
    expect(needsResync(true, true)).toBe(false);
    expect(needsResync(false, false)).toBe(false);
    expect(needsResync(true, false)).toBe(false);
  });
});
