import { fetchDischargeBody, postLifeBatch } from './lifeClient';

describe('life client', () => {
  const original = global.fetch;

  afterEach(() => {
    global.fetch = original;
  });

  it('returns the discharge body only when the server responds', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => '' }) as unknown as typeof fetch;
    await expect(fetchDischargeBody('https://api.test', 'ALTA-1')).resolves.toBeNull();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"medications":[]}' }) as unknown as typeof fetch;
    await expect(fetchDischargeBody('https://api.test', 'ALTA-1')).resolves.toContain('medications');
  });

  it('does not treat a failed sync as success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(postLifeBatch('https://api.test', [{ id: '1', kind: 'biometrics', body: '[]', status: 'pending' }])).resolves.toBe(false);
  });
});
