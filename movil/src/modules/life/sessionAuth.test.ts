import { createHash } from 'crypto';
import type { ApiResult, AuthPayload, LifeClient } from '../../shared/api/lifeClient';
import { createTokenStore } from '../../shared/api/tokenStore';
import { emptySnapshot, LifeApp } from './lifeApp';
import { loginAccount, logoutSession, registerCitizen, SWITCHED_ACCOUNT_NOTICE, UNSAFE_STORAGE_NOTICE } from './sessionAuth';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const clock = { now: () => new Date('2026-10-03T12:00:00.000Z'), random: () => 'salt-abcd1234', digest };

function app() {
  return new LifeApp(emptySnapshot(), clock);
}

function memoryStore(persistent = true) {
  let token: string | null = null;
  return createTokenStore(
    persistent
      ? {
          getItemAsync: async () => token,
          setItemAsync: async (_k, v) => {
            token = v;
          },
          deleteItemAsync: async () => {
            token = null;
          },
        }
      : null,
  );
}

const payload = (id = 7, email = 'elena@correo.test'): AuthPayload => ({ token: `tok-${id}`, account: { id, name: 'Elena', email } });
const ok = (data: AuthPayload): ApiResult<AuthPayload> => ({ ok: true, data });
const fail = (status: number, extra: { message?: string; errors?: Record<string, string> } = {}): ApiResult<AuthPayload> => ({
  ok: false,
  status,
  message: extra.message ?? 'x',
  ...(extra.errors ? { errors: extra.errors } : {}),
});

function fakeClient(over: Partial<Record<'login' | 'register' | 'logout', jest.Mock>>) {
  return {
    login: over.login ?? jest.fn(),
    register: over.register ?? jest.fn(),
    logout: over.logout ?? jest.fn(async () => ({ ok: true, data: undefined })),
  } as unknown as LifeClient;
}

const serverLogin = (id: number, email?: string) => fakeClient({ login: jest.fn(async () => ok(payload(id, email))) });
const input = { name: 'Elena', email: 'Elena@Correo.test', password: 'calma12345', confirm: 'calma12345' };
const PW = 'calma12345';

describe('sessionAuth', () => {
  it('registers on the server, stores only the token and the account, never the password', async () => {
    const life = app();
    const tokenStore = memoryStore();
    const register = jest.fn(async () => ok(payload()));
    const outcome = await registerCitizen({ life, client: fakeClient({ register }), tokenStore }, input);
    expect(outcome.errors).toEqual({});
    expect(register).toHaveBeenCalledWith({ name: 'Elena', email: 'elena@correo.test', password: PW });
    expect(await tokenStore.get()).toBe('tok-7');
    expect(life.currentUser()).toMatchObject({ id: '7', name: 'Elena', email: 'elena@correo.test' });
    expect(JSON.stringify(life.state)).not.toContain(PW);
    expect(life.state.accounts[0].passwordHash).toBeUndefined();
    expect(life.state.accounts[0].salt).toBeUndefined();
  });

  it('validates before calling the server', async () => {
    const register = jest.fn();
    const outcome = await registerCitizen({ life: app(), client: fakeClient({ register }), tokenStore: memoryStore() }, { ...input, password: 'corta1', confirm: 'corta1' });
    expect(outcome.errors.password).toBe('Usa al menos 10 caracteres.');
    expect(register).not.toHaveBeenCalled();
  });

  it('maps 422 field errors, using the server Spanish text or a generic one', async () => {
    const register = jest.fn(async () => fail(422, { errors: { email: 'El correo ya está registrado.', password: '' } }));
    const outcome = await registerCitizen({ life: app(), client: fakeClient({ register }), tokenStore: memoryStore() }, input);
    expect(outcome.errors.email).toBe('El correo ya está registrado.');
    expect(outcome.errors.password).toBe('La contraseña no cumple los requisitos.');
    expect(outcome.errors.name).toBeUndefined();
  });

  it('maps 401 on login, 429 and network failures to form errors', async () => {
    const store = memoryStore();
    const run = async (status: number) => {
      const login = jest.fn(async () => fail(status));
      return loginAccount({ life: app(), client: fakeClient({ login }), tokenStore: store }, 'elena@correo.test', PW);
    };
    expect((await run(401)).errors.form).toBe('Correo o contraseña incorrectos.');
    expect((await run(429)).errors.form).toBe('Demasiados intentos. Espera un minuto e intenta de nuevo.');
    expect((await run(0)).errors.form).toBe('Sin conexión. Conéctate para iniciar sesión.');
  });

  it('never opens a session from typed credentials while offline, whatever the password', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: serverLogin(7), tokenStore }, 'elena@correo.test', PW);
    life.logout();
    const offline = fakeClient({ login: jest.fn(async () => fail(0)) });
    const outcome = await loginAccount({ life, client: offline, tokenStore }, 'elena@correo.test', 'cualquiera');
    expect(outcome.errors.form).toBe('Sin conexión. Conéctate para iniciar sesión.');
    expect(life.currentUser()).toBeNull();
    const local = app();
    local.register(input);
    local.logout();
    const second = await loginAccount({ life: local, client: offline, tokenStore: memoryStore() }, 'elena@correo.test', PW);
    expect(second.errors.form).toBe('Sin conexión. Conéctate para iniciar sesión.');
    expect(local.currentUser()).toBeNull();
  });

  it('resumes at startup from the persisted session without typing anything', async () => {
    const first = app();
    const tokenStore = memoryStore();
    await loginAccount({ life: first, client: serverLogin(7), tokenStore }, 'elena@correo.test', PW);
    const restored = new LifeApp(JSON.parse(JSON.stringify(first.state)), clock);
    expect(restored.currentUser()?.email).toBe('elena@correo.test');
    expect(await tokenStore.get()).toBe('tok-7');
  });

  it('keeps the local-only behaviour without a client', async () => {
    const life = app();
    const tokenStore = memoryStore();
    const created = await registerCitizen({ life, client: null, tokenStore }, input);
    expect(created.errors).toEqual({});
    expect(life.currentUser()?.passwordHash).toBeTruthy();
    life.logout();
    expect((await loginAccount({ life, client: null, tokenStore }, 'elena@correo.test', PW)).errors).toEqual({});
    expect((await loginAccount({ life, client: null, tokenStore }, 'elena@correo.test', 'otra-clave1')).errors.form).toMatch(/incorrectos/i);
    expect(await tokenStore.get()).toBeNull();
  });

  it('adopts the data of a local-only account on the first server login, with no wipe and no notice', async () => {
    const local = app();
    local.register(input);
    local.addManual('heart_rate', '70');
    local.saveContact({ name: 'Marta', phone: '51999888777', enabled: true });
    local.setSharing(true);
    const withPlan = new LifeApp({ ...local.state, plan: { id: 'p1', medications: [] } as never }, clock);
    const queued = withPlan.state.queue.length;
    expect(queued).toBeGreaterThan(0);
    const outcome = await loginAccount({ life: withPlan, client: serverLogin(7), tokenStore: memoryStore() }, 'elena@correo.test', PW);
    expect(outcome.errors).toEqual({});
    expect(outcome.confirmation).toBeUndefined();
    expect(outcome.notices ?? []).not.toContain(SWITCHED_ACCOUNT_NOTICE);
    expect(withPlan.currentUser()?.id).toBe('7');
    expect(withPlan.state.accounts).toHaveLength(1);
    expect(withPlan.state.samples).toHaveLength(1);
    expect(withPlan.state.queue).toHaveLength(queued);
    expect(withPlan.state.plan?.id).toBe('p1');
    expect(withPlan.state.contact?.name).toBe('Marta');
    expect(withPlan.state.consent.sharingEnabled).toBe(true);
  });

  it('keeps everything on re-login of the same server account, even with different email case', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: serverLogin(7), tokenStore }, 'elena@correo.test', PW);
    life.addManual('heart_rate', '70');
    life.logout();
    const again = await loginAccount({ life, client: serverLogin(7, 'ELENA@Correo.test'), tokenStore }, 'ELENA@Correo.test', PW);
    expect(again.errors).toEqual({});
    expect(again.confirmation).toBeUndefined();
    expect(again.notices ?? []).not.toContain(SWITCHED_ACCOUNT_NOTICE);
    expect(life.state.samples).toHaveLength(1);
    expect(life.pendingSyncCount()).toBeGreaterThan(0);
    expect(life.currentUser()?.email).toBe('elena@correo.test');
  });

  it('asks for confirmation before wiping unsent data of another server account, and wipes only after confirming', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: serverLogin(7), tokenStore }, 'elena@correo.test', PW);
    life.addManual('heart_rate', '70');
    life.logout();
    await tokenStore.clear();
    const pending = life.pendingSyncCount();
    expect(pending).toBeGreaterThan(0);

    const cancelled = await loginAccount({ life, client: serverLogin(9), tokenStore }, 'otro@correo.test', PW);
    expect(cancelled.confirmation?.pendingCount).toBe(pending);
    expect(life.state.samples).toHaveLength(1);
    expect(life.currentUser()).toBeNull();
    expect(await tokenStore.get()).toBeNull();
    await cancelled.confirmation?.cancel();
    expect(life.state.samples).toHaveLength(1);
    expect(life.pendingSyncCount()).toBe(pending);
    expect(life.state.accounts[0].id).toBe('7');
    expect(await tokenStore.get()).toBeNull();

    const again = await loginAccount({ life, client: serverLogin(9), tokenStore }, 'otro@correo.test', PW);
    const confirmed = await again.confirmation!.confirm();
    expect(confirmed.errors).toEqual({});
    expect(confirmed.notices).toContain(SWITCHED_ACCOUNT_NOTICE);
    expect(SWITCHED_ACCOUNT_NOTICE).toBe('Se cambió de cuenta; los datos locales anteriores se borraron.');
    expect(life.state.samples).toHaveLength(0);
    expect(life.state.queue).toHaveLength(0);
    expect(life.currentUser()?.id).toBe('9');
    expect(await tokenStore.get()).toBe('tok-9');
  });

  it('switches accounts with a notice but no prompt when nothing is unsent', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: serverLogin(7), tokenStore }, 'elena@correo.test', PW);
    life.logout();
    const outcome = await loginAccount({ life, client: serverLogin(9), tokenStore }, 'otro@correo.test', PW);
    expect(outcome.confirmation).toBeUndefined();
    expect(outcome.notices).toContain(SWITCHED_ACCOUNT_NOTICE);
    expect(life.currentUser()?.id).toBe('9');
  });

  it('warns when the token cannot be stored securely', async () => {
    const outcome = await loginAccount({ life: app(), client: serverLogin(7), tokenStore: memoryStore(false) }, 'elena@correo.test', PW);
    expect(outcome.notices).toContain(UNSAFE_STORAGE_NOTICE);
  });

  it('clears token and session on logout even when the server call fails', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: serverLogin(7), tokenStore }, 'elena@correo.test', PW);
    life.addManual('heart_rate', '70');
    const logout = jest.fn(async () => {
      throw new Error('red');
    });
    await logoutSession({ life, client: fakeClient({ logout }), tokenStore });
    expect(logout).toHaveBeenCalled();
    expect(await tokenStore.get()).toBeNull();
    expect(life.currentUser()).toBeNull();
    expect(life.pendingSyncCount()).toBeGreaterThan(0);
  });

  it('does not call the server on logout without a token', async () => {
    const life = app();
    life.register(input);
    const logout = jest.fn();
    await logoutSession({ life, client: fakeClient({ logout }), tokenStore: memoryStore() });
    expect(logout).not.toHaveBeenCalled();
    expect(life.currentUser()).toBeNull();
  });
});
