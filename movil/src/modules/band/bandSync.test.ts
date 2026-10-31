import { createBandStore } from './bandStore';
import { applyBandRecords, readBandOnce, syncBandHistory, type HistoryClient } from './bandSync';
import type { MinuteRecord } from './domain/history';

const RECORD: MinuteRecord = { minute: 29_889_360, heartRate: 72, spo2: 98, rmssd: 42 };

function fakeClient(records: MinuteRecord[] | Error = [RECORD]) {
  const log: string[] = [];
  const client: HistoryClient = {
    connect: async (id) => {
      log.push(`connect:${id}`);
      return { battery: null };
    },
    downloadHistory: async (from) => {
      log.push(`download:${from}`);
      if (records instanceof Error) {
        throw records;
      }
      return records;
    },
    ack: async (minute) => {
      log.push(`ack:${minute}`);
    },
    disconnect: async () => {
      log.push('disconnect');
    },
  };
  return { client, log };
}

async function pairedStore(lastMinute: number | null = null, accountId: string | null = 'u1') {
  const store = createBandStore(null);
  await store.set({ id: 'AA:BB:CC:DD', name: 'Vitalsy-CCDD', lastMinute, accountId });
  return store;
}

describe('syncBandHistory', () => {
  it('downloads from the minute after the last synced one, saves, then confirms to the band', async () => {
    const { client, log } = fakeClient();
    const store = await pairedStore(29_889_000);
    const apply = jest.fn(async () => true);

    const result = await syncBandHistory({ client, store, apply });

    expect(log).toEqual(['download:29889001', 'ack:29889360']);
    expect(apply).toHaveBeenCalledWith(
      [
        expect.objectContaining({ kind: 'heart_rate', origin: 'vitalsy_band' }),
        expect.objectContaining({ kind: 'spo2' }),
        expect.objectContaining({ kind: 'hrv' }),
      ],
      'u1',
    );
    expect(result).toEqual({ added: 3, upTo: 29_889_360 });
    expect((await store.get())?.lastMinute).toBe(29_889_360);
  });

  it('starts from the beginning when the band was never synced', async () => {
    const { client, log } = fakeClient([]);
    expect(await syncBandHistory({ client, store: await pairedStore(), apply: async () => true })).toEqual({ added: 0, upTo: null });
    expect(log).toEqual(['download:0']);
  });

  it('does not confirm when the phone could not save the samples (the band keeps them)', async () => {
    const { client, log } = fakeClient();
    const store = await pairedStore(10);

    await syncBandHistory({ client, store, apply: async () => false });

    expect(log).not.toContain('ack:29889360');
    expect((await store.get())?.lastMinute).toBe(10);
  });
});

describe('applyBandRecords', () => {
  it('saves pushed records and confirms them', async () => {
    const { client, log } = fakeClient();
    const store = await pairedStore();
    expect(await applyBandRecords({ client, store, apply: async () => true }, [RECORD])).toBe(3);
    expect(log).toEqual(['ack:29889360']);
  });

  it('never saves nor confirms records of a band without an owner account', async () => {
    const { client, log } = fakeClient();
    const apply = jest.fn(async () => true);
    expect(await applyBandRecords({ client, store: await pairedStore(null, null), apply }, [RECORD])).toBe(0);
    expect(apply).not.toHaveBeenCalled();
    expect(log).toEqual([]);
  });
});

describe('readBandOnce', () => {
  it('connects to the paired band, syncs and always disconnects', async () => {
    const { client, log } = fakeClient(new Error('history_timeout'));
    const outcome = await readBandOnce({ client, store: await pairedStore(), apply: async () => true });
    expect(outcome).toBe('failed');
    expect(log).toEqual(['connect:AA:BB:CC:DD', 'download:0', 'disconnect']);
  });

  it('does nothing without a paired band', async () => {
    const { client, log } = fakeClient();
    expect(await readBandOnce({ client, store: createBandStore(null), apply: async () => true })).toBe('none');
    expect(log).toEqual([]);
  });

  it('reports a read when samples were saved', async () => {
    const { client } = fakeClient();
    expect(await readBandOnce({ client, store: await pairedStore(), apply: async () => true })).toBe('read');
  });
});
