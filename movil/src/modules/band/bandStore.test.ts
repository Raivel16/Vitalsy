import { createBandStore } from './bandStore';

function memoryBackend() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      items.delete(key);
    },
  };
}

describe('bandStore', () => {
  it('remembers the paired band and the last synced minute', async () => {
    const backend = memoryBackend();
    const store = createBandStore(backend);
    await store.set({ id: 'AA:BB', name: 'Vitalsy-12EF', lastMinute: null });
    await store.markSynced(29_889_360);

    expect(await createBandStore(backend).get()).toEqual({ id: 'AA:BB', name: 'Vitalsy-12EF', lastMinute: 29_889_360 });
  });

  it('never moves the synced minute backwards', async () => {
    const store = createBandStore(memoryBackend());
    await store.set({ id: 'AA:BB', name: 'Vitalsy-12EF', lastMinute: 100 });
    await store.markSynced(50);
    expect((await store.get())?.lastMinute).toBe(100);
  });

  it('forgets the band', async () => {
    const store = createBandStore(memoryBackend());
    await store.set({ id: 'AA:BB', name: 'Vitalsy-12EF', lastMinute: null });
    await store.clear();
    expect(await store.get()).toBeNull();
  });

  it('ignores corrupt data and works in memory without SecureStore', async () => {
    const backend = memoryBackend();
    backend.items.set('vitalsy.life.band', '{roto');
    expect(await createBandStore(backend).get()).toBeNull();

    const memory = createBandStore(null);
    await memory.set({ id: 'X', name: 'Vitalsy-0001', lastMinute: null });
    expect((await memory.get())?.id).toBe('X');
  });
});
