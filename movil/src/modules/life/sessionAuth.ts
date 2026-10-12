import type { LifeClient } from '../../shared/api/lifeClient';
import type { TokenStore } from '../../shared/api/tokenStore';
import { validateLogin, validateRegister, type FieldErrors } from '../auth/domain/auth';
import type { LifeApp } from './lifeApp';

export type Confirmation = {
  /** Lecturas sin enviar que se borrarían de este teléfono. */
  pendingCount: number;
  confirm: () => Promise<AuthOutcome>;
  cancel: () => Promise<void>;
};

export type AuthOutcome = { errors: FieldErrors; notices?: string[]; confirmation?: Confirmation };

type Deps = { life: LifeApp; client: LifeClient | null; tokenStore: TokenStore };

export const LOCAL_ONLY_BANNER = 'Cuenta solo en este teléfono';
export const SWITCHED_ACCOUNT_NOTICE = 'Se cambió de cuenta; los datos locales anteriores se borraron.';
export const UNSAFE_STORAGE_NOTICE =
  'La sesión no se puede guardar de forma segura en este dispositivo; tendrás que iniciar sesión otra vez al reabrir.';

const BAD_CREDENTIALS = 'Correo o contraseña incorrectos.';
const TOO_MANY = 'Demasiados intentos. Espera un minuto e intenta de nuevo.';
const OFFLINE = 'Sin conexión. Conéctate para iniciar sesión.';

const GENERIC_FIELD: Record<string, string> = {
  name: 'Revisa el nombre.',
  email: 'Revisa el correo.',
  password: 'La contraseña no cumple los requisitos.',
};

type Failure = { status: number; message: string; errors?: Record<string, string> };

function mapFailure(failure: Failure): FieldErrors {
  if (failure.status === 0) {
    return { form: OFFLINE };
  }
  if (failure.status === 429) {
    return { form: TOO_MANY };
  }
  if (failure.status === 401) {
    return { form: BAD_CREDENTIALS };
  }
  if (failure.status === 422) {
    const errors: FieldErrors = {};
    for (const field of Object.keys(GENERIC_FIELD)) {
      if (failure.errors && field in failure.errors) {
        errors[field] = failure.errors[field].trim() || GENERIC_FIELD[field];
      }
    }
    return Object.keys(errors).length > 0 ? errors : { form: failure.message };
  }
  return { form: failure.message };
}

function sessionNotices(tokenStore: TokenStore, switched: boolean): string[] {
  const notices: string[] = [];
  if (switched) {
    notices.push(SWITCHED_ACCOUNT_NOTICE);
  }
  if (!tokenStore.persistent) {
    notices.push(UNSAFE_STORAGE_NOTICE);
  }
  return notices;
}

async function openFromServer(
  { life, tokenStore }: Deps,
  payload: { token: string; account: { id: number; name: string; email: string } },
): Promise<AuthOutcome> {
  const opened = life.openServerSession(payload.account);
  if (opened.status === 'needs_confirmation') {
    // El token nuevo no se guarda hasta confirmar: la cola de la otra cuenta no debe enviarse con él.
    return {
      errors: {},
      confirmation: {
        pendingCount: opened.pendingCount,
        confirm: async () => {
          await tokenStore.set(payload.token);
          const result = life.openServerSession(payload.account, { confirmed: true });
          const notices = sessionNotices(tokenStore, result.status === 'ok' && result.switched);
          return { errors: {}, ...(notices.length > 0 ? { notices } : {}) };
        },
        cancel: async () => undefined,
      },
    };
  }
  await tokenStore.set(payload.token);
  const notices = sessionNotices(tokenStore, opened.switched);
  return { errors: {}, ...(notices.length > 0 ? { notices } : {}) };
}

export async function registerCitizen(deps: Deps, input: { name: string; email: string; password: string; confirm: string }): Promise<AuthOutcome> {
  const { life, client } = deps;
  if (!client) {
    return { errors: life.register(input).errors };
  }
  const errors = validateRegister(input);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  const result = await client.register({ name: input.name.trim(), email: input.email.trim().toLowerCase(), password: input.password });
  if (!result.ok) {
    return { errors: mapFailure(result) };
  }
  return openFromServer(deps, result.data);
}

export async function loginAccount(deps: Deps, email: string, password: string): Promise<AuthOutcome> {
  const { life, client } = deps;
  if (!client) {
    return { errors: life.login(email, password).errors };
  }
  const errors = validateLogin(email, password);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  const result = await client.login({ email: email.trim().toLowerCase(), password });
  if (result.ok) {
    return openFromServer(deps, result.data);
  }
  return { errors: mapFailure(result) };
}

/** Cierra sesión: el cierre en el servidor es de mejor esfuerzo; token y sesión local siempre se borran. */
export async function logoutSession({ life, client, tokenStore }: Deps): Promise<void> {
  try {
    const token = await tokenStore.get().catch(() => null);
    if (client && token) {
      await client.logout();
    }
  } catch {
    // Mejor esfuerzo.
  } finally {
    await tokenStore.clear().catch(() => undefined);
    life.logout();
  }
}
