import { createTokenStore, type SecureBackend } from './tokenStore';

describe('token store', () => {
  it('persists through the secure backend', async () => {
    const data = new Map<string, string>();
    const backend: SecureBackend = {
      getItemAsync: async (key) => data.get(key) ?? null,
      setItemAsync: async (key, value) => void data.set(key, value),
      deleteItemAsync: async (key) => void data.delete(key),
    };
    const store = createTokenStore(backend);
    await store.set('abc');
    expect(await store.get()).toBe('abc');
    await store.clear();
    expect(await store.get()).toBeNull();
  });

  it('falls back to memory when the backend is missing or throws', async () => {
    const memoryOnly = createTokenStore(null);
    await memoryOnly.set('m');
    expect(await memoryOnly.get()).toBe('m');
    const broken: SecureBackend = {
      getItemAsync: async () => {
        throw new Error('native');
      },
      setItemAsync: async () => {
        throw new Error('native');
      },
      deleteItemAsync: async () => {
        throw new Error('native');
      },
    };
    const store = createTokenStore(broken);
    await store.set('t');
    expect(await store.get()).toBe('t');
    await store.clear();
    expect(await store.get()).toBeNull();
  });
});
