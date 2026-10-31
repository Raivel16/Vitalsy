import type { BandClient, BandEvents, FoundBand } from './bandClient';
import type { BandStore, PairedBand } from './bandStore';
import { applyBandRecords, syncBandHistory, type ApplySamples } from './bandSync';
import type { BandPhase, BandQuality } from './domain/gatt';

export type ControllerClient = Pick<
  BandClient,
  'bluetoothOn' | 'scan' | 'connect' | 'downloadHistory' | 'ack' | 'disconnect' | 'forget'
>;

export type BandConnection = 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected';

export type BandLive = {
  phase: BandPhase;
  quality: BandQuality | null;
  bpm: number | null;
  spo2: number | null;
  pi: number;
  /** Desde cuándo (ms) no hay dedo; null si hay dedo. Los valores se conservan para no perder la última lectura. */
  fingerOffSince: number | null;
};

export type BandMessage = { tone: 'info' | 'warning' | 'danger'; text: string };

export type BandView = {
  available: boolean;
  paired: PairedBand | null;
  connection: BandConnection;
  found: FoundBand[];
  live: BandLive | null;
  battery: number | null;
  message: BandMessage | null;
};

export type BandControllerDeps = {
  /** null: sin módulo Bluetooth. */
  client: ControllerClient | null;
  store: BandStore;
  requestPermissions: () => Promise<boolean>;
  apply: ApplySamples;
  onPairedChange: (paired: boolean) => void;
  /** Cuenta con sesión abierta: la banda solo se muestra y se conecta para la cuenta que la vinculó. */
  currentAccount: () => string | null;
  /** Reloj en ms (para el tiempo sin dedo). Por defecto `Date.now`. */
  now?: () => number;
};

const TEXT = {
  noSession: 'Inicia sesión para vincular la banda.',
  noPermission: 'Sin permiso de Bluetooth no se puede buscar la banda.',
  bluetoothOff: 'Activa el Bluetooth para conectar la banda.',
  notFound: 'No encontramos ninguna banda Vitalsy cerca. Enciéndela y acércala al teléfono.',
  pairFailed:
    'No se pudo vincular. Revisa la clave de 6 dígitos que muestra tu banda; si ya estuvo vinculada a otro teléfono, bórrala en la banda.',
  connectFailed: 'No se pudo conectar con la banda. Acércala al teléfono e inténtalo de nuevo.',
  historyFailed: 'La banda está conectada, pero no se pudo descargar su historial. Se reintentará al reconectar.',
  scanFailed: 'No se pudo buscar la banda. Inténtalo de nuevo.',
};

function savedText(added: number, paired: boolean): string {
  const prefix = paired ? 'Banda vinculada. ' : '';
  if (added === 0) {
    return paired ? 'Banda vinculada. Las lecturas se guardan cada minuto.' : 'Banda conectada.';
  }
  return `${prefix}Se guardaron ${added} lecturas de la banda.`;
}

/**
 * Estado y acciones de la banda (RF-113), sin React: lo envuelve BandProvider.
 * Toda acción valida antes (permisos, Bluetooth) y deja un mensaje visible de éxito o error.
 */
export class BandController {
  view: BandView;
  private readonly listeners = new Set<() => void>();

  constructor(private deps: BandControllerDeps) {
    this.view = {
      available: deps.client !== null,
      paired: null,
      connection: 'idle',
      found: [],
      live: null,
      battery: null,
      message: null,
    };
  }

  /** La app cambia de instancia de LifeApp al cargar del disco: se actualizan los destinos sin recrear la conexión. */
  setHandlers(handlers: Pick<BandControllerDeps, 'apply' | 'onPairedChange' | 'currentAccount'>): void {
    this.deps = { ...this.deps, ...handlers };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async load(): Promise<void> {
    this.set({ paired: await this.ownBand() });
  }

  /** Al abrir o cerrar sesión: si la banda no es de la cuenta nueva se desconecta; si lo es, se reconecta. */
  async sessionChanged(): Promise<void> {
    const paired = await this.ownBand();
    if (this.view.paired && paired?.id !== this.view.paired.id) {
      await this.deps.client?.disconnect().catch(() => undefined);
      this.set({ connection: 'idle', live: null, battery: null, found: [], message: null });
    }
    this.set({ paired });
    await this.reconnect();
  }

  /** La banda guardada, solo si la vinculó la cuenta con sesión abierta. */
  private async ownBand(): Promise<PairedBand | null> {
    const stored = await this.deps.store.get();
    const account = this.deps.currentAccount();
    return stored && account && stored.accountId === account ? stored : null;
  }

  async scan(): Promise<void> {
    const client = this.deps.client;
    if (!client || this.busy() || !(await this.ready(client))) {
      return;
    }
    this.set({ connection: 'scanning', found: [], message: null });
    try {
      const found = await client.scan();
      this.set({ connection: 'idle', found, message: found.length === 0 ? { tone: 'warning', text: TEXT.notFound } : null });
    } catch {
      this.set({ connection: 'idle', message: { tone: 'danger', text: TEXT.scanFailed } });
    }
  }

  async pair(band: FoundBand): Promise<void> {
    const client = this.deps.client;
    const accountId = this.deps.currentAccount();
    if (!accountId) {
      this.set({ message: { tone: 'warning', text: TEXT.noSession } });
      return;
    }
    if (!client || this.busy() || !(await this.ready(client))) {
      return;
    }
    const candidate: PairedBand = { id: band.id, name: band.name, lastMinute: null, accountId };
    if (!(await this.connect(client, candidate, true))) {
      return;
    }
    this.set({ found: [] });
  }

  async reconnect(): Promise<void> {
    const client = this.deps.client;
    const paired = this.view.paired;
    if (!client || !paired || this.busy() || this.view.connection === 'connected' || !(await this.ready(client))) {
      return;
    }
    await this.connect(client, paired, false);
  }

  async forget(): Promise<void> {
    const paired = this.view.paired;
    if (!paired) {
      return;
    }
    await this.deps.client?.forget(paired.id).catch(() => undefined);
    await this.deps.store.clear();
    this.deps.onPairedChange(false);
    this.set({ paired: null, connection: 'idle', live: null, battery: null, message: { tone: 'info', text: 'Banda olvidada.' } });
  }

  private busy(): boolean {
    return this.view.connection === 'scanning' || this.view.connection === 'connecting';
  }

  /** Validación previa: permisos y Bluetooth encendido. */
  private async ready(client: ControllerClient): Promise<boolean> {
    if (!(await this.deps.requestPermissions().catch(() => false))) {
      this.set({ message: { tone: 'danger', text: TEXT.noPermission } });
      return false;
    }
    if (!(await client.bluetoothOn().catch(() => false))) {
      this.set({ message: { tone: 'warning', text: TEXT.bluetoothOff } });
      return false;
    }
    return true;
  }

  private async connect(client: ControllerClient, band: PairedBand, pairing: boolean): Promise<boolean> {
    this.set({ connection: 'connecting', message: null, paired: pairing ? this.view.paired : band });
    let battery: number | null;
    try {
      ({ battery } = await client.connect(band.id, this.events(client), { pairing }));
    } catch {
      await client.disconnect().catch(() => undefined);
      this.set({ connection: pairing ? 'idle' : 'disconnected', message: { tone: 'danger', text: pairing ? TEXT.pairFailed : TEXT.connectFailed } });
      return false;
    }
    if (pairing) {
      await this.deps.store.set(band);
      this.deps.onPairedChange(true);
    }
    this.set({ paired: band, connection: 'connected', battery, live: null });
    try {
      const { added } = await syncBandHistory(this.syncDeps(client));
      this.set({ paired: await this.deps.store.get(), message: { tone: 'info', text: savedText(added, pairing) } });
    } catch {
      this.set({ message: { tone: 'warning', text: TEXT.historyFailed } });
    }
    return true;
  }

  private syncDeps(client: ControllerClient) {
    return { client, store: this.deps.store, apply: this.deps.apply };
  }

  private events(client: ControllerClient): BandEvents {
    return {
      onState: (state) => {
        const previous = this.view.live;
        // Sin dedo se conserva la última lectura; «ajustando» no cambia desde cuándo no había dedo.
        let fingerOffSince = previous?.fingerOffSince ?? null;
        if (state.phase === 'measuring') {
          fingerOffSince = null;
        } else if (state.phase === 'no_finger') {
          fingerOffSince ??= this.now();
        }
        this.set({
          live: {
            phase: state.phase,
            quality: state.quality,
            pi: state.pi,
            bpm: previous?.bpm ?? null,
            spo2: previous?.spo2 ?? null,
            fingerOffSince,
          },
        });
      },
      onHeartRate: (reading) => this.patchLive({ bpm: reading.bpm }),
      onPlx: (reading) => {
        if (reading.spo2 !== null) {
          this.patchLive({ spo2: reading.spo2 });
        }
      },
      onRecords: (records) => {
        void applyBandRecords(this.syncDeps(client), records)
          .then(async () => this.set({ paired: await this.deps.store.get() }))
          .catch(() => undefined);
      },
      onBattery: (battery) => this.set({ battery }),
      onDisconnected: () => this.set({ connection: 'disconnected', live: null }),
    };
  }

  private patchLive(patch: Partial<BandLive>): void {
    const live = this.view.live ?? { phase: 'measuring' as const, quality: null, bpm: null, spo2: null, pi: 0, fingerOffSince: null };
    this.set({ live: { ...live, ...patch } });
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private set(patch: Partial<BandView>): void {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
