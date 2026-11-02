import { BandController, type ControllerClient } from './bandController';
import { createBandStore } from './bandStore';
import type { BandEvents, FoundBand } from './bandClient';

const BAND: FoundBand = { id: 'AA:BB:CC:DD', name: 'Vitalsy-CCDD', rssi: -60 };

function setup(
  options: { bluetooth?: boolean; permissions?: boolean; found?: FoundBand[]; connectError?: Error; account?: string | null } = {},
) {
  let events: BandEvents = {};
  let account = options.account === undefined ? 'u1' : options.account;
  const clock = { now: 0 };
  const log: string[] = [];
  const client: ControllerClient = {
    bluetoothOn: async () => options.bluetooth ?? true,
    scan: async () => options.found ?? [BAND],
    connect: async (id, handlers) => {
      log.push(`connect:${id}`);
      if (options.connectError) {
        throw options.connectError;
      }
      events = handlers;
      return { battery: 80 };
    },
    downloadHistory: async () => [{ minute: 29_889_360, heartRate: 72, spo2: 98, rmssd: null }],
    ack: async (minute) => {
      log.push(`ack:${minute}`);
    },
    disconnect: async () => {
      log.push('disconnect');
    },
    forget: async (id) => {
      log.push(`forget:${id}`);
    },
  };
  const store = createBandStore(null);
  const applied: number[] = [];
  const paired: boolean[] = [];
  const controller = new BandController({
    client,
    store,
    requestPermissions: async () => options.permissions ?? true,
    apply: async (samples) => {
      applied.push(samples.length);
      return true;
    },
    onPairedChange: (value) => paired.push(value),
    currentAccount: () => account,
    now: () => clock.now,
  });
  const setAccount = (next: string | null) => {
    account = next;
  };
  return { controller, store, log, applied, paired, setAccount, clock, events: () => events };
}

describe('BandController', () => {
  it('is unavailable without a Bluetooth client', () => {
    const controller = new BandController({
      client: null,
      store: createBandStore(null),
      requestPermissions: async () => true,
      apply: async () => true,
      onPairedChange: () => undefined,
      currentAccount: () => 'u1',
    });
    expect(controller.view.available).toBe(false);
  });

  it('validates permissions and Bluetooth before searching', async () => {
    const denied = setup({ permissions: false });
    await denied.controller.scan();
    expect(denied.controller.view.message).toEqual({ tone: 'danger', text: 'Sin permiso de Bluetooth no se puede buscar la banda.' });

    const off = setup({ bluetooth: false });
    await off.controller.scan();
    expect(off.controller.view.message).toEqual({ tone: 'warning', text: 'Activa el Bluetooth para conectar la banda.' });
    expect(off.controller.view.connection).toBe('idle');
  });

  it('tells the person when no band is nearby', async () => {
    const { controller } = setup({ found: [] });
    await controller.scan();
    expect(controller.view.found).toEqual([]);
    expect(controller.view.message?.text).toMatch(/No encontramos ninguna banda Vitalsy/);
  });

  it('pairs a found band, remembers it and saves its pending history', async () => {
    const { controller, store, log, applied, paired } = setup();
    await controller.scan();
    expect(controller.view.found).toEqual([BAND]);

    await controller.pair(BAND);

    expect(controller.view.connection).toBe('connected');
    expect(controller.view.battery).toBe(80);
    expect(controller.view.found).toEqual([]);
    expect(await store.get()).toEqual({ id: BAND.id, name: BAND.name, lastMinute: 29_889_360, accountId: 'u1' });
    expect(applied).toEqual([2]);
    expect(log).toContain('ack:29889360');
    expect(paired).toEqual([true]);
    expect(controller.view.message).toEqual({ tone: 'info', text: 'Banda vinculada. Se guardaron 2 lecturas de la banda.' });
  });

  it('does not remember a band it could not connect to', async () => {
    const { controller, store, paired } = setup({ connectError: new Error('timeout') });
    await controller.pair(BAND);
    expect(await store.get()).toBeNull();
    expect(paired).toEqual([]);
    expect(controller.view.connection).toBe('idle');
    expect(controller.view.message?.tone).toBe('danger');
  });

  it('tells the user to check the 6-digit key when pairing fails', async () => {
    const { controller } = setup({ connectError: new Error('Bond request has been denied') });
    await controller.pair(BAND);
    expect(controller.view.message?.text).toMatch(/clave de 6 dígitos/);
  });

  it('keeps the generic message when a plain reconnection fails', async () => {
    const failing = setup({ connectError: new Error('timeout') });
    await failing.store.set({ ...BAND, lastMinute: null, accountId: 'u1' });
    await failing.controller.load();
    await failing.controller.reconnect();
    expect(failing.controller.view.message?.text).not.toMatch(/clave/);
  });

  it('updates the live reading from the band notifications', async () => {
    const { controller, events } = setup();
    await controller.pair(BAND);

    events().onState?.({ phase: 'measuring', quality: 'good', channelsSwapped: false, channelWarning: false, pi: 2.35, r: 0.55 });
    events().onHeartRate?.({ bpm: 72, contact: true, rrMs: [833] });
    events().onPlx?.({ spo2: 98, pulse: 72, pi: 2.35, reliable: true });

    expect(controller.view.live).toEqual({ phase: 'measuring', quality: 'good', bpm: 72, spo2: 98, pi: 2.35, fingerOffSince: null });
  });

  it('follows battery updates from the band', async () => {
    const { controller, events } = setup();
    await controller.pair(BAND);
    events().onBattery?.(55);
    expect(controller.view.battery).toBe(55);
  });

  it('keeps the last reading when the finger is removed and remembers since when', async () => {
    const { controller, events, clock } = setup();
    await controller.pair(BAND);
    events().onState?.({ phase: 'measuring', quality: 'good', channelsSwapped: false, channelWarning: false, pi: 2, r: 0.5 });
    events().onHeartRate?.({ bpm: 72, contact: true, rrMs: [] });
    events().onPlx?.({ spo2: 98, pulse: 72, pi: 2, reliable: true });

    clock.now = 5_000;
    events().onState?.({ phase: 'no_finger', quality: null, channelsSwapped: false, channelWarning: false, pi: 0, r: null });
    expect(controller.view.live).toEqual({ phase: 'no_finger', quality: null, bpm: 72, spo2: 98, pi: 0, fingerOffSince: 5_000 });

    clock.now = 9_000; // otra notificación sin dedo: no reinicia el tiempo
    events().onState?.({ phase: 'no_finger', quality: null, channelsSwapped: false, channelWarning: false, pi: 0, r: null });
    expect(controller.view.live?.fingerOffSince).toBe(5_000);
  });

  it('forgets the time without finger as soon as it measures again', async () => {
    const { controller, events, clock } = setup();
    await controller.pair(BAND);
    events().onHeartRate?.({ bpm: 72, contact: true, rrMs: [] });
    clock.now = 5_000;
    events().onState?.({ phase: 'no_finger', quality: null, channelsSwapped: false, channelWarning: false, pi: 0, r: null });
    events().onState?.({ phase: 'adjusting', quality: null, channelsSwapped: false, channelWarning: false, pi: 0, r: null });
    expect(controller.view.live?.fingerOffSince).toBe(5_000);
    events().onState?.({ phase: 'measuring', quality: 'good', channelsSwapped: false, channelWarning: false, pi: 2, r: 0.5 });
    expect(controller.view.live?.fingerOffSince).toBeNull();
  });

  it('saves records the band pushes every minute', async () => {
    const { controller, events, applied } = setup();
    await controller.pair(BAND);
    events().onRecords?.([{ minute: 29_889_400, heartRate: 70, spo2: null, rmssd: null }]);
    await new Promise((resolve) => setImmediate(resolve));
    expect(applied).toEqual([2, 1]);
  });

  it('marks the band as disconnected and reconnects on demand', async () => {
    const { controller, events, log } = setup();
    await controller.pair(BAND);
    events().onDisconnected?.();
    expect(controller.view.connection).toBe('disconnected');

    await controller.reconnect();
    expect(controller.view.connection).toBe('connected');
    expect(log.filter((entry) => entry.startsWith('connect:'))).toHaveLength(2);
  });

  it('reconnects to a band remembered from a previous session', async () => {
    const { controller, store } = setup();
    await store.set({ id: BAND.id, name: BAND.name, lastMinute: null, accountId: 'u1' });
    await controller.load();
    expect(controller.view.paired?.name).toBe(BAND.name);
    await controller.reconnect();
    expect(controller.view.connection).toBe('connected');
  });

  it('ignores a band paired by another account on this phone', async () => {
    const { controller, store, log } = setup();
    await store.set({ id: BAND.id, name: BAND.name, lastMinute: null, accountId: 'u2' });
    await controller.load();
    expect(controller.view.paired).toBeNull();
    await controller.reconnect();
    expect(log).toEqual([]);
  });

  it('asks for a session before pairing', async () => {
    const { controller, store, log } = setup({ account: null });
    await controller.pair(BAND);
    expect(log).toEqual([]);
    expect(await store.get()).toBeNull();
    expect(controller.view.message).toEqual({ tone: 'warning', text: 'Inicia sesión para vincular la banda.' });
  });

  it('disconnects the band when its owner logs out and resumes when they come back', async () => {
    const { controller, log, setAccount } = setup();
    await controller.pair(BAND);

    setAccount(null);
    await controller.sessionChanged();
    expect(log).toContain('disconnect');
    expect(controller.view.paired).toBeNull();
    expect(controller.view.connection).toBe('idle');

    setAccount('u1');
    await controller.sessionChanged();
    expect(controller.view.paired?.id).toBe(BAND.id);
    expect(controller.view.connection).toBe('connected');
  });

  it('forgets the band', async () => {
    const { controller, store, log, paired } = setup();
    await controller.pair(BAND);
    await controller.forget();
    expect(await store.get()).toBeNull();
    expect(log).toContain(`forget:${BAND.id}`);
    expect(controller.view.paired).toBeNull();
    expect(paired).toEqual([true, false]);
  });

  it('notifies subscribers on every change', async () => {
    const { controller } = setup();
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);
    await controller.scan();
    unsubscribe();
    expect(listener).toHaveBeenCalled();
  });
});
