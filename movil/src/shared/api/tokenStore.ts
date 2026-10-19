export type SessionBinding = {
  token: string;
  /** Cuenta a la que pertenece el token. null: token anterior a este campo (sin vínculo conocido). */
  accountId: string | null;
};

export type TokenStore = {
  /** false cuando el token solo vive en memoria (SecureStore no disponible). */
  readonly persistent: boolean;
  get: () => Promise<string | null>;
  /** Token y cuenta a la que pertenece, leídos en una sola operación. */
  getBinding: () => Promise<SessionBinding | null>;
  set: (token: string, accountId?: string | null) => Promise<void>;
  clear: () => Promise<void>;
  /** Marca durable de «cambio de cuenta en curso»: sobrevive a que el sistema mate la app a mitad. */
  setTransition: (active: boolean) => Promise<void>;
  isTransitioning: () => Promise<boolean>;
};

export type SecureBackend = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const KEY = 'vitalsy.life.token';
const TRANSITION_KEY = 'vitalsy.life.session-transition';

function parseBinding(raw: string | null): SessionBinding | null {
  if (!raw) {
    return null;
  }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { token?: unknown; accountId?: unknown };
      if (typeof parsed.token === 'string' && parsed.token) {
        return { token: parsed.token, accountId: typeof parsed.accountId === 'string' && parsed.accountId ? parsed.accountId : null };
      }
      return null;
    } catch {
      return null;
    }
  }
  // Formato anterior: el token solo, sin cuenta.
  return { token: raw, accountId: null };
}

export function createTokenStore(backend: SecureBackend | null = null): TokenStore {
  let memory: SessionBinding | null = null;
  let memoryTransition = false;
  let secure = backend;

  async function read(): Promise<SessionBinding | null> {
    if (secure) {
      try {
        return parseBinding(await secure.getItemAsync(KEY));
      } catch {
        secure = null;
      }
    }
    return memory;
  }

  return {
    get persistent() {
      return secure !== null;
    },
    async get() {
      return (await read())?.token ?? null;
    },
    getBinding: read,
    async set(token, accountId = null) {
      memory = { token, accountId };
      if (secure) {
        try {
          await secure.setItemAsync(KEY, JSON.stringify(memory));
        } catch {
          secure = null;
        }
      }
    },
    async clear() {
      memory = null;
      if (secure) {
        try {
          await secure.deleteItemAsync(KEY);
        } catch {
          secure = null;
        }
      }
    },
    async setTransition(active) {
      memoryTransition = active;
      if (secure) {
        try {
          if (active) {
            await secure.setItemAsync(TRANSITION_KEY, '1');
          } else {
            await secure.deleteItemAsync(TRANSITION_KEY);
          }
        } catch {
          secure = null;
        }
      }
    },
    async isTransitioning() {
      if (secure) {
        try {
          return (await secure.getItemAsync(TRANSITION_KEY)) === '1';
        } catch {
          secure = null;
        }
      }
      return memoryTransition;
    },
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

export const tokenStore: TokenStore = createTokenStore(loadSecureStore());
