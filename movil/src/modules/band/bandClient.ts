import {
  BAND_NAME_PREFIX,
  BAND_UUID,
  parseBandState,
  parseHeartRate,
  parsePlx,
  shortUuid,
  type BandState,
  type HeartRateReading,
  type PlxReading,
} from './domain/gatt';
import { ackHistoryCommand, parseHistoryChunk, requestHistoryCommand, setTimeCommand, type MinuteRecord } from './domain/history';

type Subscription = { remove: () => void };

export type BlePeripheral = { id: string; name?: string; rssi: number; advertising?: { localName?: string } };

/** Lo que usa la app de `react-native-ble-manager` (se inyecta para probar sin teléfono). */
export type BleApi = {
  start: (options?: { showAlert?: boolean }) => Promise<void>;
  checkState: () => Promise<string>;
  scan: (options: { serviceUUIDs?: string[]; seconds?: number }) => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  createBond: (id: string) => Promise<void>;
  removeBond: (id: string) => Promise<void>;
  retrieveServices: (id: string) => Promise<{ services?: Array<{ uuid: string }> }>;
  startNotification: (id: string, service: string, characteristic: string) => Promise<void>;
  write: (id: string, service: string, characteristic: string, data: number[]) => Promise<void>;
  read: (id: string, service: string, characteristic: string) => Promise<number[]>;
  onDiscoverPeripheral: (callback: (peripheral: BlePeripheral) => void) => Subscription;
  onStopScan: (callback: () => void) => Subscription;
  onDisconnectPeripheral: (callback: (event: { peripheral: string }) => void) => Subscription;
  onDidUpdateValueForCharacteristic: (
    callback: (event: { peripheral: string; characteristic: string; value: number[] }) => void,
  ) => Subscription;
};

export type FoundBand = { id: string; name: string; rssi: number };

export type BandEvents = {
  onState?: (state: BandState) => void;
  onHeartRate?: (reading: HeartRateReading) => void;
  onPlx?: (reading: PlxReading) => void;
  /** Registros por minuto que la banda envía sola mientras está conectada. */
  onRecords?: (records: MinuteRecord[]) => void;
  /** Batería en %, solo si la banda tiene Battery Service. */
  onBattery?: (percent: number) => void;
  onDisconnected?: () => void;
};

type Options = { historyTimeoutMs?: number };

type Download = {
  records: MinuteRecord[];
  resolve: (records: MinuteRecord[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const SUBSCRIBED = [
  [BAND_UUID.vitalsyService, BAND_UUID.state],
  [BAND_UUID.heartRateService, BAND_UUID.heartRateMeasurement],
  [BAND_UUID.plxService, BAND_UUID.plxContinuous],
  [BAND_UUID.vitalsyService, BAND_UUID.history],
] as const;

/**
 * Conexión con una banda Vitalsy por BLE (RF-113): escaneo, vinculación, notificaciones,
 * hora e historial. Una banda a la vez. Contrato: docs/architecture/protocolo-banda-ble.md.
 */
export class BandClient {
  connectedId: string | null = null;
  private started = false;
  private events: BandEvents = {};
  private download: Download | null = null;
  private subscriptions: Subscription[] = [];
  private readonly historyTimeoutMs: number;

  constructor(
    private readonly api: BleApi,
    private readonly os: string,
    private readonly now: () => Date,
    options: Options = {},
  ) {
    this.historyTimeoutMs = options.historyTimeoutMs ?? 30_000;
  }

  async start(): Promise<void> {
    if (!this.started) {
      await this.api.start({ showAlert: false });
      this.started = true;
    }
  }

  async bluetoothOn(): Promise<boolean> {
    await this.start();
    return (await this.api.checkState()) === 'on';
  }

  /** Busca bandas durante `seconds` segundos. */
  async scan(seconds = 6): Promise<FoundBand[]> {
    await this.start();
    const found = new Map<string, FoundBand>();
    const discover = this.api.onDiscoverPeripheral((peripheral) => {
      const name = peripheral.name ?? peripheral.advertising?.localName ?? '';
      if (!name.startsWith(BAND_NAME_PREFIX)) {
        return;
      }
      const previous = found.get(peripheral.id);
      if (!previous || peripheral.rssi > previous.rssi) {
        found.set(peripheral.id, { id: peripheral.id, name, rssi: peripheral.rssi });
      }
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(finish, (seconds + 2) * 1000);
        const stop = this.api.onStopScan(finish);
        function finish() {
          clearTimeout(timer);
          stop.remove();
          resolve();
        }
        this.api.scan({ serviceUUIDs: [BAND_UUID.heartRateService], seconds }).catch((error: unknown) => {
          clearTimeout(timer);
          stop.remove();
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    } finally {
      discover.remove();
    }
    return [...found.values()].sort((a, b) => b.rssi - a.rssi);
  }

  /** Conecta, vincula (Android), se suscribe y da la hora. Devuelve la batería si la banda la expone. */
  async connect(id: string, events: BandEvents, options: { pairing?: boolean } = {}): Promise<{ battery: number | null }> {
    await this.start();
    this.events = events;
    this.listen(id);
    await this.api.connect(id);
    if (this.os === 'android') {
      // Android pide aquí la clave de 6 dígitos que muestra la banda. Si la clave es incorrecta o se cancela, falla;
      // al solo reconectar, un error de vinculación se tolera (el acceso a las características lo dirá).
      const bonding = this.api.createBond(id);
      await (options.pairing ? bonding : bonding.catch(() => undefined));
    }
    const info = await this.api.retrieveServices(id);
    for (const [service, characteristic] of SUBSCRIBED) {
      await this.api.startNotification(id, service, characteristic);
    }
    this.connectedId = id;
    await this.command(setTimeCommand(this.now()));
    const hasBattery = (info.services ?? []).some((service) => shortUuid(service.uuid) === BAND_UUID.batteryService);
    if (!hasBattery) {
      return { battery: null };
    }
    await this.api.startNotification(id, BAND_UUID.batteryService, BAND_UUID.batteryLevel).catch(() => undefined);
    return { battery: await this.readBattery() };
  }

  async readBattery(): Promise<number | null> {
    if (!this.connectedId) {
      return null;
    }
    const value = await this.api.read(this.connectedId, BAND_UUID.batteryService, BAND_UUID.batteryLevel).catch(() => null);
    return value && value.length > 0 ? value[0] : null;
  }

  async command(bytes: number[]): Promise<void> {
    if (!this.connectedId) {
      throw new Error('not_connected');
    }
    await this.api.write(this.connectedId, BAND_UUID.vitalsyService, BAND_UUID.control, bytes);
  }

  /** Descarga los registros desde `fromMinute` hasta el marcador de fin. */
  async downloadHistory(fromMinute: number): Promise<MinuteRecord[]> {
    if (this.download) {
      throw new Error('history_busy');
    }
    const result = new Promise<MinuteRecord[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.download = null;
        reject(new Error('history_timeout'));
      }, this.historyTimeoutMs);
      this.download = { records: [], resolve, reject, timer };
    });
    try {
      await this.command(requestHistoryCommand(fromMinute));
    } catch (error) {
      this.finishDownload();
      throw error;
    }
    return result;
  }

  async ack(upToMinute: number): Promise<void> {
    await this.command(ackHistoryCommand(upToMinute));
  }

  async disconnect(): Promise<void> {
    const id = this.connectedId;
    this.connectedId = null;
    this.unlisten();
    if (id) {
      await this.api.disconnect(id).catch(() => undefined);
    }
  }

  /** Desconecta y, en Android, borra la vinculación del sistema. */
  async forget(id: string): Promise<void> {
    await this.disconnect();
    if (this.os === 'android') {
      await this.api.removeBond(id).catch(() => undefined);
    }
  }

  private listen(id: string): void {
    this.unlisten();
    this.subscriptions = [
      this.api.onDidUpdateValueForCharacteristic((event) => {
        if (event.peripheral === id) {
          this.dispatch(shortUuid(event.characteristic), event.value);
        }
      }),
      this.api.onDisconnectPeripheral((event) => {
        if (event.peripheral !== id) {
          return;
        }
        this.connectedId = null;
        this.download?.reject(new Error('disconnected'));
        this.finishDownload();
        this.unlisten();
        this.events.onDisconnected?.();
      }),
    ];
  }

  private unlisten(): void {
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];
  }

  private finishDownload(): void {
    if (this.download) {
      clearTimeout(this.download.timer);
      this.download = null;
    }
  }

  private dispatch(characteristic: string, value: number[]): void {
    switch (characteristic) {
      case BAND_UUID.heartRateMeasurement: {
        const reading = parseHeartRate(value);
        if (reading) {
          this.events.onHeartRate?.(reading);
        }
        return;
      }
      case BAND_UUID.plxContinuous: {
        const reading = parsePlx(value);
        if (reading) {
          this.events.onPlx?.(reading);
        }
        return;
      }
      case BAND_UUID.state: {
        const state = parseBandState(value);
        if (state) {
          this.events.onState?.(state);
        }
        return;
      }
      case BAND_UUID.history:
        this.onHistory(value);
        return;
      case BAND_UUID.batteryLevel:
        if (value.length > 0) {
          this.events.onBattery?.(value[0]);
        }
    }
  }

  private onHistory(value: number[]): void {
    const chunk = parseHistoryChunk(value);
    if (!chunk) {
      return;
    }
    const download = this.download;
    if (!download) {
      if (chunk.records.length > 0) {
        this.events.onRecords?.(chunk.records);
      }
      return;
    }
    download.records.push(...chunk.records);
    if (chunk.end) {
      this.finishDownload();
      download.resolve(download.records);
    }
  }
}
