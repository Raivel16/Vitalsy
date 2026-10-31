import { BandClient, type BleApi, type BlePeripheral } from './bandClient';
import { BAND_UUID } from './domain/gatt';

type ValueEvent = { peripheral: string; characteristic: string; value: number[] };

function fakeBle(bondError?: string) {
  const handlers = {
    discover: [] as Array<(p: BlePeripheral) => void>,
    stop: [] as Array<() => void>,
    disconnect: [] as Array<(e: { peripheral: string }) => void>,
    value: [] as Array<(e: ValueEvent) => void>,
  };
  const sub = <T,>(list: T[], cb: T) => {
    list.push(cb);
    return { remove: () => list.splice(list.indexOf(cb), 1) };
  };
  const calls: string[] = [];
  const writes: number[][] = [];
  let found: BlePeripheral[] = [];
  const api: BleApi = {
    start: async () => {
      calls.push('start');
    },
    checkState: async () => 'on',
    scan: async () => {
      calls.push('scan');
      setTimeout(() => {
        found.forEach((p) => handlers.discover.forEach((cb) => cb(p)));
        handlers.stop.forEach((cb) => cb());
      }, 0);
    },
    stopScan: async () => undefined,
    connect: async (id) => {
      calls.push(`connect:${id}`);
    },
    disconnect: async (id) => {
      calls.push(`disconnect:${id}`);
    },
    createBond: async (id) => {
      calls.push(`bond:${id}`);
      if (bondError) {
        throw new Error(bondError);
      }
    },
    removeBond: async (id) => {
      calls.push(`removeBond:${id}`);
    },
    retrieveServices: async () => ({ services: [{ uuid: '180D' }, { uuid: '1822' }, { uuid: BAND_UUID.vitalsyService }] }),
    startNotification: async (_id, _service, characteristic) => {
      calls.push(`notify:${characteristic}`);
    },
    write: async (_id, _service, _characteristic, data) => {
      writes.push(data);
    },
    read: async () => [87],
    onDiscoverPeripheral: (cb) => sub(handlers.discover, cb),
    onStopScan: (cb) => sub(handlers.stop, cb),
    onDisconnectPeripheral: (cb) => sub(handlers.disconnect, cb),
    onDidUpdateValueForCharacteristic: (cb) => sub(handlers.value, cb),
  };
  return {
    api,
    calls,
    writes,
    setFound: (list: BlePeripheral[]) => {
      found = list;
    },
    emit: (event: ValueEvent) => handlers.value.forEach((cb) => cb(event)),
    drop: (peripheral: string) => handlers.disconnect.forEach((cb) => cb({ peripheral })),
  };
}

const NOW = () => new Date('2026-10-30T12:00:00Z');

describe('BandClient', () => {
  it('lists only Vitalsy bands, strongest signal first and without duplicates', async () => {
    const ble = fakeBle();
    ble.setFound([
      { id: 'A', name: 'Vitalsy-0001', rssi: -80 },
      { id: 'B', name: 'Reloj de otra marca', rssi: -40 },
      { id: 'C', rssi: -50, advertising: { localName: 'Vitalsy-0002' } },
      { id: 'A', name: 'Vitalsy-0001', rssi: -70 },
    ]);
    const client = new BandClient(ble.api, 'android', NOW);

    const bands = await client.scan(1);

    expect(bands).toEqual([
      { id: 'C', name: 'Vitalsy-0002', rssi: -50 },
      { id: 'A', name: 'Vitalsy-0001', rssi: -70 },
    ]);
  });

  it('bonds on Android, subscribes to every measurement and gives the band the time', async () => {
    const ble = fakeBle();
    const client = new BandClient(ble.api, 'android', NOW);

    const info = await client.connect('A', {});

    expect(ble.calls).toEqual(
      expect.arrayContaining(['connect:A', 'bond:A', `notify:${BAND_UUID.state}`, 'notify:2a37', 'notify:2a5f', `notify:${BAND_UUID.history}`]),
    );
    expect(ble.writes[0]).toEqual([0x03, 0xc0, 0x86, 0xe4, 0x6a]);
    expect(info.battery).toBeNull();
  });

  it('fails the pairing when Android denies the bond (wrong passkey)', async () => {
    const ble = fakeBle('Bond request has been denied');
    const client = new BandClient(ble.api, 'android', NOW);
    await expect(client.connect('A', {}, { pairing: true })).rejects.toThrow('denied');
    expect(ble.calls).not.toContain(`notify:${BAND_UUID.state}`);
  });

  it('tolerates a bond error when only reconnecting', async () => {
    const ble = fakeBle('Create bond request fail');
    await expect(new BandClient(ble.api, 'android', NOW).connect('A', {})).resolves.toEqual({ battery: null });
  });

  it('does not bond explicitly on iOS (the system pairs when the band asks)', async () => {
    const ble = fakeBle();
    await new BandClient(ble.api, 'ios', NOW).connect('A', {});
    expect(ble.calls).not.toContain('bond:A');
  });

  it('routes notifications by characteristic, accepting 128-bit UUIDs from Android', async () => {
    const ble = fakeBle();
    const onHeartRate = jest.fn();
    const onState = jest.fn();
    const onPlx = jest.fn();
    const client = new BandClient(ble.api, 'android', NOW);
    await client.connect('A', { onHeartRate, onState, onPlx });

    ble.emit({ peripheral: 'A', characteristic: '00002a37-0000-1000-8000-00805f9b34fb', value: [0x16, 0x48, 0x55, 0x03] });
    ble.emit({ peripheral: 'A', characteristic: BAND_UUID.state.toUpperCase(), value: [1, 2, 5, 0, 0xeb, 0, 0x37, 0] });
    ble.emit({ peripheral: 'A', characteristic: '2A5F', value: [0x1c, 0x62, 0x00, 0x48, 0x00, 0x20, 0, 0, 0, 0, 0xeb, 0xe0] });
    ble.emit({ peripheral: 'OTRO', characteristic: '2a37', value: [0x00, 0x50] });

    expect(onHeartRate).toHaveBeenCalledTimes(1);
    expect(onHeartRate).toHaveBeenCalledWith({ bpm: 72, contact: true, rrMs: [833] });
    expect(onState).toHaveBeenCalledWith(expect.objectContaining({ phase: 'measuring', quality: 'good' }));
    expect(onPlx).toHaveBeenCalledWith(expect.objectContaining({ spo2: 98, reliable: true }));
  });

  it('downloads history until the end marker', async () => {
    const ble = fakeBle();
    const client = new BandClient(ble.api, 'android', NOW);
    await client.connect('A', {});

    const download = client.downloadHistory(29_889_000);
    ble.emit({ peripheral: 'A', characteristic: BAND_UUID.history, value: [1, 0x50, 0x13, 0xc8, 0x01, 72, 98, 0x2a, 0x00] });
    ble.emit({ peripheral: 'A', characteristic: BAND_UUID.history, value: [0] });

    await expect(download).resolves.toEqual([{ minute: 29_889_360, heartRate: 72, spo2: 98, rmssd: 42 }]);
    expect(ble.writes).toContainEqual([0x04, 0xe8, 0x11, 0xc8, 0x01]);
  });

  it('passes records the band pushes while connected to onRecords', async () => {
    const ble = fakeBle();
    const onRecords = jest.fn();
    const client = new BandClient(ble.api, 'android', NOW);
    await client.connect('A', { onRecords });

    ble.emit({ peripheral: 'A', characteristic: BAND_UUID.history, value: [1, 0x50, 0x13, 0xc8, 0x01, 72, 98, 0xff, 0xff] });

    expect(onRecords).toHaveBeenCalledWith([{ minute: 29_889_360, heartRate: 72, spo2: 98, rmssd: null }]);
  });

  it('fails the download when the band stops answering', async () => {
    jest.useFakeTimers();
    try {
      const ble = fakeBle();
      const client = new BandClient(ble.api, 'android', NOW, { historyTimeoutMs: 1000 });
      await client.connect('A', {});
      const download = client.downloadHistory(0);
      jest.advanceTimersByTime(1001);
      await expect(download).rejects.toThrow('history_timeout');
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports a disconnection and forgets the bond on Android', async () => {
    const ble = fakeBle();
    const onDisconnected = jest.fn();
    const client = new BandClient(ble.api, 'android', NOW);
    await client.connect('A', { onDisconnected });

    ble.drop('A');
    expect(onDisconnected).toHaveBeenCalled();
    expect(client.connectedId).toBeNull();

    await client.forget('A');
    expect(ble.calls).toContain('removeBond:A');
  });

  it('reads the battery when the band exposes the Battery service and follows its updates', async () => {
    const ble = fakeBle();
    ble.api.retrieveServices = async () => ({ services: [{ uuid: '0000180f-0000-1000-8000-00805f9b34fb' }] });
    const onBattery = jest.fn();
    const info = await new BandClient(ble.api, 'android', NOW).connect('A', { onBattery });
    expect(info.battery).toBe(87);
    expect(ble.calls).toContain('notify:2a19');

    ble.emit({ peripheral: 'A', characteristic: '2A19', value: [64] });
    expect(onBattery).toHaveBeenCalledWith(64);
  });

  it('does not subscribe to the battery when the band has none', async () => {
    const ble = fakeBle();
    await new BandClient(ble.api, 'android', NOW).connect('A', {});
    expect(ble.calls).not.toContain('notify:2a19');
  });
});
