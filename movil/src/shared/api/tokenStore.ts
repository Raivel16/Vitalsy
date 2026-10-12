export type TokenStore = {
  /** false cuando el token solo vive en memoria (SecureStore no disponible). */
  readonly persistent: boolean;
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type SecureBackend = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const KEY = 'vitalsy.life.token';

export function createTokenStore(backend?: SecureBackend | null): TokenStore {
  let memory: string | null = null;
  let secure = backend ?? null;
  return {
    get persistent() {
      return secure !== null;
    },
    async get() {
      if (secure) {
        try {
          return await secure.getItemAsync(KEY);
        } catch {
          secure = null;
        }
      }
      return memory;
    },
    async set(token) {
      memory = token;
      if (secure) {
        try {
          await secure.setItemAsync(KEY, token);
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
