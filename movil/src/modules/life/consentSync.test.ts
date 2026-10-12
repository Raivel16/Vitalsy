import { createHash } from 'crypto';
import type { LifeClient } from '../../shared/api/lifeClient';
import { changeSharing, issueServerLinkCode, retryPendingConsent } from './consentSync';
import { emptySnapshot, LifeApp } from './lifeApp';

const clock = {
  now: () => new Date('2026-10-03T12:00:00.000Z'),
  random: () => 'salt-abcd1234',
  digest: (value: string) => createHash('sha256').update(value).digest('hex'),
};

const noop = async () => undefined;
const net = { ok: false, status: 0, message: 'Sin conexión' };

function sharingOn() {
  const life = new LifeApp(emptySnapshot(), clock);
  life.confirmSharing();
  return life;
}

function deps(life: LifeApp, client: unknown, extra: Partial<{ hasSession: boolean; online: boolean; onUnauthorized: () => Promise<void> }> = {}) {
  return { life, client: client as LifeClient | null, hasSession: true, online: true, onUnauthorized: noop, ...extra };
}

describe('changeSharing', () => {
  it('revoking online tells the server and clears the pending state only on confirmation', async () => {
    const life = sharingOn();
    life.setServerLinkCode('K7QX-93MP', '2026-10-03T12:30:00.000Z');
    const setConsent = jest.fn(async () => ({ ok: true, data: { sharingEnabled: false, revokedAt: '2026-10-03T12:00:01.000Z' } }));
    const result = await changeSharing(false, deps(life, { setConsent }));
    expect(setConsent).toHaveBeenCalledWith(false);
    expect(result).toMatchObject({ ok: true, status: 'confirmed' });
    expect(life.state.consentRevokePending).toBe(false);
    expect(life.state.consent.linkingCode).toBeNull();
  });

  it('revoking offline closes locally at once, marks it pending and says so honestly', async () => {
    const life = sharingOn();
    const setConsent = jest.fn(async () => net);
    const result = await changeSharing(false, deps(life, { setConsent }));
    expect(life.state.consent.sharingEnabled).toBe(false);
    expect(life.state.consentRevokePending).toBe(true);
    expect(result).toMatchObject({ ok: true, status: 'pending' });
    expect(result.message).toContain('Se revocará en cuanto haya conexión');
  });

  it('persists the revoke intent before awaiting the network call', async () => {
    const life = sharingOn();
    const order: string[] = [];
    const setConsent = jest.fn(async () => {
      order.push(`put:pending=${life.state.consentRevokePending}`);
      return net;
    });
    const persist = jest.fn(async () => {
      order.push(`save:pending=${life.state.consentRevokePending}`);
    });
    await changeSharing(false, { ...deps(life, { setConsent }), persist });
    expect(order).toEqual(['save:pending=true', 'put:pending=true']);
  });

  it('revoking without a session stays pending and does not call the server', async () => {
    const life = sharingOn();
    const setConsent = jest.fn();
    const result = await changeSharing(false, deps(life, { setConsent }, { hasSession: false }));
    expect(setConsent).not.toHaveBeenCalled();
    expect(result.status).toBe('pending');
    expect(life.state.consentRevokePending).toBe(true);
  });

  it('local-only mode revokes without any pending state', async () => {
    const life = sharingOn();
    const result = await changeSharing(false, deps(life, null));
    expect(result).toMatchObject({ ok: true, status: 'confirmed' });
    expect(life.state.consentRevokePending).toBe(false);
    expect(life.state.consent.sharingEnabled).toBe(false);
  });

  it('granting requires the server to confirm when a server is configured', async () => {
    const life = new LifeApp(emptySnapshot(), clock);
    const failing = await changeSharing(true, deps(life, { setConsent: jest.fn(async () => net) }));
    expect(failing.ok).toBe(false);
    expect(life.state.consent.sharingEnabled).toBe(false);
    const setConsent = jest.fn(async () => ({ ok: true, data: { sharingEnabled: true, revokedAt: null } }));
    const ok = await changeSharing(true, deps(life, { setConsent }));
    expect(setConsent).toHaveBeenCalledWith(true);
    expect(ok.ok).toBe(true);
    expect(life.state.consent.sharingEnabled).toBe(true);
  });

  it('does not enable when the server answers without enabling or there is no session', async () => {
    const life = new LifeApp(emptySnapshot(), clock);
    const odd = await changeSharing(true, deps(life, { setConsent: jest.fn(async () => ({ ok: true, data: { sharingEnabled: false, revokedAt: null } })) }));
    expect(odd.ok).toBe(false);
    const noSession = await changeSharing(true, deps(life, { setConsent: jest.fn() }, { hasSession: false }));
    expect(noSession.ok).toBe(false);
    expect(life.state.consent.sharingEnabled).toBe(false);
  });

  it('granting without a server configured works locally', async () => {
    const life = new LifeApp(emptySnapshot(), clock);
    const result = await changeSharing(true, deps(life, null));
    expect(result.ok).toBe(true);
    expect(life.state.consent.sharingEnabled).toBe(true);
  });

  it('a late grant confirmation does not reopen sharing after the user revoked meanwhile', async () => {
    const life = new LifeApp(emptySnapshot(), clock);
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => (release = resolve));
    const setConsent = jest
      .fn()
      .mockImplementationOnce(() => gate)
      .mockImplementationOnce(async () => ({ ok: true, data: { sharingEnabled: false, revokedAt: 'x' } }));
    const grant = changeSharing(true, deps(life, { setConsent }));
    const revoke = changeSharing(false, deps(life, { setConsent }));
    release({ ok: true, data: { sharingEnabled: true, revokedAt: null } });
    await Promise.all([grant, revoke]);
    expect(life.state.consent.sharingEnabled).toBe(false);
    expect(setConsent).toHaveBeenLastCalledWith(false);
    expect(life.state.consentRevokePending).toBe(false);
  });
});

describe('retryPendingConsent', () => {
  function pendingRevoke() {
    const life = sharingOn();
    life.revokeSharing(true);
    return life;
  }

  it('retries and clears the pending revoke when the server confirms', async () => {
    const life = pendingRevoke();
    const setConsent = jest.fn(async () => ({ ok: true, data: { sharingEnabled: false, revokedAt: 'x' } }));
    await retryPendingConsent(deps(life, { setConsent }));
    expect(setConsent).toHaveBeenCalledWith(false);
    expect(life.state.consentRevokePending).toBe(false);
  });

  it('keeps it pending when the retry fails and clears the session on 401', async () => {
    const life = pendingRevoke();
    await retryPendingConsent(deps(life, { setConsent: jest.fn(async () => net) }));
    expect(life.state.consentRevokePending).toBe(true);
    const unauthorized = jest.fn(async () => undefined);
    await retryPendingConsent(
      deps(life, { setConsent: jest.fn(async () => ({ ok: false, status: 401, message: 'x' })) }, { onUnauthorized: unauthorized }),
    );
    expect(unauthorized).toHaveBeenCalled();
    expect(life.state.consentRevokePending).toBe(true);
    await retryPendingConsent(deps(life, { setConsent: jest.fn(async () => { throw new Error('boom'); }) }));
    expect(life.state.consentRevokePending).toBe(true);
  });

  it('does nothing when offline, without session or with nothing pending', async () => {
    const setConsent = jest.fn();
    const life = pendingRevoke();
    await retryPendingConsent(deps(life, { setConsent }, { online: false }));
    await retryPendingConsent(deps(life, { setConsent }, { hasSession: false }));
    await retryPendingConsent(deps(sharingOn(), { setConsent }));
    expect(setConsent).not.toHaveBeenCalled();
  });
});

describe('issueServerLinkCode', () => {
  const issued = { ok: true, data: { code: 'K7QX-93MP', expiresAt: '2026-10-03T12:30:00.000Z' } };

  it('shows the server code with its expiry and never generates one locally', async () => {
    const life = sharingOn();
    const issueLinkCode = jest.fn(async () => issued);
    const result = await issueServerLinkCode(deps(life, { issueLinkCode }));
    expect(result).toEqual({ ok: true, code: 'K7QX-93MP', expiresAt: '2026-10-03T12:30:00.000Z' });
    expect(life.state.consent.linkingCode).toBe('K7QX-93MP');
    expect(life.state.consent.linkingExpiresAt).toBe('2026-10-03T12:30:00.000Z');
  });

  it('maps server and network failures to the agreed messages', async () => {
    const run = async (reply: unknown) => issueServerLinkCode(deps(sharingOn(), { issueLinkCode: jest.fn(async () => reply) }));
    expect(await run({ ok: false, status: 409, code: 'sharing_closed', message: 'x' })).toEqual({
      ok: false,
      message: 'Activa la compartición con instituciones antes de generar un código.',
    });
    expect(await run({ ok: false, status: 503, code: 'code_unavailable', message: 'x' })).toEqual({
      ok: false,
      message: 'No se pudo generar el código ahora. Intenta de nuevo.',
    });
    expect(await run({ ok: false, status: 429, message: 'x' })).toEqual({
      ok: false,
      message: 'Demasiados intentos. Espera un minuto e intenta de nuevo.',
    });
    expect(await run(net)).toEqual({ ok: false, message: 'Sin conexión. Conéctate para generar tu código.' });
  });

  it('refuses locally while sharing is off or a revoke is pending, without calling the server', async () => {
    const issueLinkCode = jest.fn(async () => issued);
    const closed = new LifeApp(emptySnapshot(), clock);
    expect((await issueServerLinkCode(deps(closed, { issueLinkCode }))).ok).toBe(false);
    const revoking = sharingOn();
    revoking.revokeSharing(true);
    expect((await issueServerLinkCode(deps(revoking, { issueLinkCode }))).ok).toBe(false);
    expect(issueLinkCode).not.toHaveBeenCalled();
  });

  it('shows no code in local-only mode and asks for a session otherwise', async () => {
    const local = await issueServerLinkCode(deps(sharingOn(), null));
    expect(local).toMatchObject({ ok: false });
    expect(local.ok === false && local.message).toMatch(/servidor/);
    const noSession = await issueServerLinkCode(deps(sharingOn(), { issueLinkCode: jest.fn() }, { hasSession: false }));
    expect(noSession).toMatchObject({ ok: false });
  });

  it('discards a code that arrives after sharing was revoked', async () => {
    const life = sharingOn();
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => (release = resolve));
    const issueLinkCode = jest.fn(() => gate);
    const pending = issueServerLinkCode(deps(life, { issueLinkCode }));
    life.revokeSharing(true);
    release(issued);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(life.state.consent.linkingCode).toBeNull();
  });
});
