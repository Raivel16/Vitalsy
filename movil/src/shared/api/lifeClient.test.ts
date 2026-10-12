import { apiBaseUrl, createLifeClient } from './lifeClient';

type Reply = { status: number; body?: string };

function mockFetch(reply: Reply | Error) {
  const fn = jest.fn(async () => {
    if (reply instanceof Error) {
      throw reply;
    }
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => reply.body ?? '' };
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const item = { id: 'b1', kind: 'biometrics' as const, body: '[]', status: 'pending' as const };

describe('life client', () => {
  const original = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const token = async () => 'tok-123';

  afterEach(() => {
    global.fetch = original;
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  });

  it('sends sync to /api/v1/life/sync with the bearer token', async () => {
    const fetchMock = mockFetch({ status: 200, body: '{"accepted":["b1"],"rejected":[]}' });
    const result = await createLifeClient('https://api.test', token).sync([item]);
    expect(result).toEqual({ ok: true, data: { accepted: ['b1'], rejected: [] } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/life/sync');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    expect(JSON.parse(init.body as string)).toEqual({ items: [item] });
  });

  it('reports 401 and does not call the network without a token', async () => {
    mockFetch({ status: 401, body: '{"message":"Unauthenticated."}' });
    const unauthorized = await createLifeClient('https://api.test', token).sync([item]);
    expect(unauthorized).toMatchObject({ ok: false, status: 401 });

    const fetchMock = mockFetch({ status: 200, body: '{}' });
    const noSession = await createLifeClient('https://api.test', async () => null).sync([item]);
    expect(noSession).toMatchObject({ ok: false, status: 401, code: 'no_session' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a dropped network to status 0', async () => {
    mockFetch(new Error('Network request failed'));
    await expect(createLifeClient('https://api.test', token).sync([item])).resolves.toEqual({
      ok: false,
      status: 0,
      message: 'Sin conexión',
    });
  });

  it('tolerates non-JSON error bodies and exposes error codes', async () => {
    mockFetch({ status: 502, body: '<html>Bad gateway</html>' });
    const html = await createLifeClient('https://api.test', token).setConsent(true);
    expect(html).toMatchObject({ ok: false, status: 502 });
    if (!html.ok) {
      expect(html.message.length).toBeGreaterThan(0);
    }

    mockFetch({ status: 409, body: '{"code":"sharing_closed","message":"closed"}' });
    const closed = await createLifeClient('https://api.test', token).issueLinkCode();
    expect(closed).toMatchObject({ ok: false, status: 409, code: 'sharing_closed' });

    mockFetch({ status: 422, body: '{"code":"batch_too_large","message":"x"}' });
    const big = await createLifeClient('https://api.test', token).sync([item]);
    expect(big).toMatchObject({ ok: false, status: 422, code: 'batch_too_large' });
  });

  it('fetches notices from /life/notices and keeps only well-formed entries', async () => {
    const body = JSON.stringify({
      notices: [
        { id: 'n1', kind: 'habito', title: 'Camina', body: 'Un paseo corto', metric: 'steps', createdAt: '2026-10-03T08:00:00.000Z' },
        { id: 'n2', kind: 'otro', title: 'x', body: 'y', metric: null, createdAt: '2026-10-03T08:00:00.000Z' },
        { id: 7, kind: 'preventivo', title: 'x', body: 'y' },
      ],
    });
    const fetchMock = mockFetch({ status: 200, body });
    const result = await createLifeClient('https://api.test', token).getNotices();
    expect(result.ok && result.data.notices.map((n) => n.id)).toEqual(['n1']);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/life/notices');
    expect(init.method).toBe('GET');
    mockFetch({ status: 200, body: '{"items":[]}' });
    await expect(createLifeClient('https://api.test', token).getNotices()).resolves.toMatchObject({ ok: false, code: 'invalid_response' });
  });

  it('validates the sync response shape', async () => {
    const client = createLifeClient('https://api.test', token);
    mockFetch({ status: 200, body: '{"rejected":[]}' });
    await expect(client.sync([item])).resolves.toMatchObject({ ok: false, code: 'invalid_response' });
    mockFetch({ status: 200, body: '{"accepted":["b1",7],"rejected":"nope"}' });
    await expect(client.sync([item])).resolves.toEqual({ ok: true, data: { accepted: ['b1', '7'], rejected: [] } });
    mockFetch({ status: 200, body: '{"accepted":[],"rejected":[{"id":3,"reason":"bad"},null]}' });
    await expect(client.sync([item])).resolves.toEqual({ ok: true, data: { accepted: [], rejected: [{ id: '3', reason: 'bad' }] } });
  });

  it('maps a 401 on login to a credentials message', async () => {
    mockFetch({ status: 401, body: '{"message":"Unauthenticated."}' });
    const result = await createLifeClient('https://api.test', async () => null).login({ email: 'a@b.c', password: 'x' });
    expect(result).toEqual({ ok: false, status: 401, message: 'Correo o contraseña incorrectos.' });
  });

  it('logs in without a token and registers with the account payload', async () => {
    const fetchMock = mockFetch({ status: 200, body: '{"token":"t","account":{"id":1,"name":"A","email":"a@b.c"}}' });
    const client = createLifeClient('https://api.test', async () => null);
    const login = await client.login({ email: 'a@b.c', password: 'secret123' });
    expect(login).toMatchObject({ ok: true, data: { token: 't' } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/life/auth/login');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    await client.register({ name: 'A', email: 'a@b.c', password: 'secret123' });
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toBe('https://api.test/api/v1/life/auth/register');
  });

  it('exposes 422 field errors as the first message per field', async () => {
    mockFetch({ status: 422, body: '{"message":"x","errors":{"email":["El correo ya está registrado."],"password":"Muy corta","name":[]}}' });
    const result = await createLifeClient('https://api.test', async () => null).register({ name: 'A', email: 'a@b.c', password: 'x' });
    expect(result).toMatchObject({ ok: false, status: 422, errors: { email: 'El correo ya está registrado.', password: 'Muy corta' } });
    expect((result as { errors: Record<string, string> }).errors.name).toBeUndefined();
  });

  it('logs out with the bearer token and accepts 204', async () => {
    const fetchMock = mockFetch({ status: 204 });
    const result = await createLifeClient('https://api.test', token).logout();
    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/life/auth/logout');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('returns the plain discharge plan body and encodes the code', async () => {
    const fetchMock = mockFetch({ status: 200, body: '{"medications":[]}' });
    const client = createLifeClient('https://api.test', token);
    await expect(client.fetchDischargePlan('ALTA 1')).resolves.toEqual({ ok: true, data: '{"medications":[]}' });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.test/api/v1/life/discharge-plans/ALTA%201');
    mockFetch({ status: 404, body: '{"code":"plan_not_found"}' });
    await expect(client.fetchDischargePlan('X')).resolves.toMatchObject({ ok: false, status: 404, code: 'plan_not_found' });
  });

  it('uses PUT for consent and POST for link codes', async () => {
    const fetchMock = mockFetch({ status: 200, body: '{"sharingEnabled":true,"revokedAt":null}' });
    const client = createLifeClient('https://api.test', token);
    await client.setConsent(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/life/consent');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ sharingEnabled: true });
    await client.issueLinkCode();
    expect((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].method).toBe('POST');
  });

  it('refuses http base URLs outside development', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test/';
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    expect(apiBaseUrl()).toBe('http://api.test');
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(apiBaseUrl()).toBeUndefined();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test/';
    expect(apiBaseUrl()).toBe('https://api.test');
  });
});
