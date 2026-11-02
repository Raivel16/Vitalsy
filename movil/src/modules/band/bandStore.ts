import type { SecureBackend } from '../../shared/api/tokenStore';

/** Banda vinculada a este teléfono por una cuenta: solo esa cuenta guarda y confirma sus datos. */
export type PairedBand = {
  /** MAC en Android, identificador del sistema en iOS. */
  id: string;
  name: string;
  /** Último minuto (época / 60) guardado en el teléfono y confirmado a la banda. */
  lastMinute: number | null;
  /** Cuenta que la vinculó. null (dato anterior): no se guarda nada hasta volver a vincularla. */
  accountId: string | null;
};

export type BandStore = {
  get: () => Promise<PairedBand | null>;
  set: (band: PairedBand) => Promise<void>;
  /** Avanza el minuto sincronizado; nunca lo hace retroceder. */
  markSynced: (minute: number) => Promise<void>;
  clear: () => Promise<void>;
};

const KEY = 'vitalsy.life.band';

function parse(raw: string | null): PairedBand | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Partial<PairedBand>;
    if (typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') {
      return null;
    }
    return {
      id: value.id,
      name: value.name,
      lastMinute: typeof value.lastMinute === 'number' ? value.lastMinute : null,
      accountId: typeof value.accountId === 'string' && value.accountId ? value.accountId : null,
    };
  } catch {
    return null;
  }
}

export function createBandStore(backend: SecureBackend | null = null): BandStore {
  let memory: PairedBand | null = null;
  let secure = backend;

  async function read(): Promise<PairedBand | null> {
    if (secure) {
      try {
        return parse(await secure.getItemAsync(KEY));
      } catch {
        secure = null;
      }
    }
    return memory;
  }

  async function write(band: PairedBand | null): Promise<void> {
    memory = band;
    if (!secure) {
      return;
    }
    try {
      if (band) {
        await secure.setItemAsync(KEY, JSON.stringify(band));
      } else {
        await secure.deleteItemAsync(KEY);
      }
    } catch {
      secure = null;
    }
  }

  return {
    get: read,
    set: write,
    async markSynced(minute) {
      const current = await read();
      if (current && (current.lastMinute === null || minute > current.lastMinute)) {
        await write({ ...current, lastMinute: minute });
      }
    },
    clear: () => write(null),
  };
}

function loadSecureStore(): SecureBackend | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('expo-secure-store') as SecureBackend;
    return typeof module.getItemAsync === 'function' ? module : null;
  } catch {
    return null;
  }
}

export const bandStore: BandStore = createBandStore(loadSecureStore());
