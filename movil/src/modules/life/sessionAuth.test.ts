import { createHash } from 'crypto';
import type { ApiResult, AuthPayload, LifeClient } from '../../shared/api/lifeClient';
import { createTokenStore } from '../../shared/api/tokenStore';
import { emptySnapshot, LifeApp } from './lifeApp';
import { loginAccount, logoutSession, registerCitizen, SWITCHED_ACCOUNT_NOTICE, UNSAFE_STORAGE_NOTICE } from './sessionAuth';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function app() {
  return new LifeApp(emptySnapshot(), { now: () => new Date('2026-10-03T12:00:00.000Z'), random: () => 'salt-abcd1234', digest });
}

function memoryStore(persistent = true) {
  let token: string | null = null;
  const store = createTokenStore(
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
  return store;
}

const payload = (id = 7): AuthPayload => ({ token: `tok-${id}`, account: { id, name: 'Elena', email: 'elena@correo.test' } });
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

const input = { name: 'Elena', email: 'Elena@Correo.test', password: 'calma12345', confirm: 'calma12345' };

describe('sessionAuth', () => {
  it('registers on the server, stores only the token and the account, never the password', async () => {
    const life = app();
    const tokenStore = memoryStore();
    const register = jest.fn(async () => ok(payload()));
    const outcome = await registerCitizen({ life, client: fakeClient({ register }), tokenStore }, input);
    expect(outcome.errors).toEqual({});
    expect(register).toHaveBeenCalledWith({ name: 'Elena', email: 'elena@correo.test', password: 'calma12345' });
    expect(await tokenStore.get()).toBe('tok-7');
    expect(life.currentUser()).toMatchObject({ id: '7', name: 'Elena', email: 'elena@correo.test' });
    const stored = JSON.stringify(life.state);
    expect(stored).not.toContain('calma12345');
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
      return loginAccount({ life: app(), client: fakeClient({ login }), tokenStore: store }, 'elena@correo.test', 'calma12345');
    };
    expect((await run(401)).errors.form).toBe('Correo o contraseña incorrectos.');
    expect((await run(429)).errors.form).toBe('Demasiados intentos. Espera un minuto e intenta de nuevo.');
    expect((await run(0)).errors.form).toBe('Sin conexión. Conéctate para iniciar sesión.');
  });

  it('does not accept a local password in server mode when offline', async () => {
    const life = app();
    life.register(input);
    const login = jest.fn(async () => fail(0));
    const outcome = await loginAccount({ life: life, client: fakeClient({ login }), tokenStore: memoryStore() }, 'elena@correo.test', 'calma12345');
    life.logout();
    expect(outcome.errors.form).toBe('Sin conexión. Conéctate para iniciar sesión.');
    expect(life.currentUser()).toBeNull();
  });

  it('enters with the stored session when offline and a token exists', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: fakeClient({ login: jest.fn(async () => ok(payload())) }), tokenStore }, 'elena@correo.test', 'calma12345');
    life.logout();
    const offline = jest.fn(async () => fail(0));
    const outcome = await loginAccount({ life, client: fakeClient({ login: offline }), tokenStore }, 'elena@correo.test', 'calma12345');
    expect(outcome.errors).toEqual({});
    expect(life.currentUser()?.email).toBe('elena@correo.test');
  });

  it('keeps the local-only behaviour without a client', async () => {
    const life = app();
    const tokenStore = memoryStore();
    const created = await registerCitizen({ life, client: null, tokenStore }, input);
    expect(created.errors).toEqual({});
    expect(life.currentUser()?.passwordHash).toBeTruthy();
    life.logout();
    expect((await loginAccount({ life, client: null, tokenStore }, 'elena@correo.test', 'calma12345')).errors).toEqual({});
    expect((await loginAccount({ life, client: null, tokenStore }, 'elena@correo.test', 'otra-clave1')).errors.form).toMatch(/incorrectos/i);
    expect(await tokenStore.get()).toBeNull();
  });

  it('clears local data and warns when a different account signs in', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: fakeClient({ login: jest.fn(async () => ok(payload(7))) }), tokenStore }, 'elena@correo.test', 'calma12345');
    life.addManual('heart_rate', '70');
    expect(life.state.samples).toHaveLength(1);
    expect(life.pendingSyncCount()).toBeGreaterThan(0);
    life.logout();
    const same = await loginAccount({ life, client: fakeClient({ login: jest.fn(async () => ok(payload(7))) }), tokenStore }, 'elena@correo.test', 'calma12345');
    expect(same.notices ?? []).not.toContain(SWITCHED_ACCOUNT_NOTICE);
    expect(life.state.samples).toHaveLength(1);
    life.logout();
    const other = await loginAccount({ life, client: fakeClient({ login: jest.fn(async () => ok(payload(9))) }), tokenStore }, 'otro@correo.test', 'calma12345');
    expect(other.notices).toContain(SWITCHED_ACCOUNT_NOTICE);
    expect(SWITCHED_ACCOUNT_NOTICE).toBe('Se cambió de cuenta; los datos locales anteriores se borraron.');
    expect(life.state.samples).toHaveLength(0);
    expect(life.state.queue).toHaveLength(0);
    expect(life.currentUser()?.id).toBe('9');
  });

  it('warns when the token cannot be stored securely', async () => {
    const outcome = await loginAccount(
      { life: app(), client: fakeClient({ login: jest.fn(async () => ok(payload())) }), tokenStore: memoryStore(false) },
      'elena@correo.test',
      'calma12345',
    );
    expect(outcome.notices).toContain(UNSAFE_STORAGE_NOTICE);
  });

  it('clears token and session on logout even when the server call fails', async () => {
    const life = app();
    const tokenStore = memoryStore();
    await loginAccount({ life, client: fakeClient({ login: jest.fn(async () => ok(payload())) }), tokenStore }, 'elena@correo.test', 'calma12345');
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
