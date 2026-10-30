import type { LifeClient } from '../../shared/api/lifeClient';
import type { TokenStore } from '../../shared/api/tokenStore';
import { validateLogin, validateRegister, type FieldErrors } from '../auth/domain/auth';
import { retryPendingConsent } from './consentSync';
import type { LifeApp } from './lifeApp';

export const REVOKE_UNDELIVERED_NOTICE =
  'Tu revocación aún no llegó al servidor. Se enviará cuando inicies sesión de nuevo con esa cuenta.';

export type Confirmation = {
  /** Lecturas sin enviar que se borrarían de este teléfono. */
  pendingCount: number;
  /** Hay una revocación de compartición que el servidor aún no recibió. */
  undeliveredRevoke?: boolean;
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

function sessionNotices(tokenStore: TokenStore, switched: boolean, undeliveredRevoke: boolean): string[] {
  const notices: string[] = [];
  if (switched) {
    notices.push(SWITCHED_ACCOUNT_NOTICE);
  }
  if (undeliveredRevoke) {
    notices.push(REVOKE_UNDELIVERED_NOTICE);
  }
  if (!tokenStore.persistent) {
    notices.push(UNSAFE_STORAGE_NOTICE);
  }
  return notices;
}

/**
 * Entrega una revocación pendiente con el token de la sesión ACTUAL (la cuenta que se va)
 * antes de reiniciar o cerrar nada. Mejor esfuerzo: si falla, queda pendiente por cuenta.
 */
async function deliverPendingRevoke({ life, client, tokenStore }: Deps): Promise<void> {
  if (!client || !life.state.consentRevokePending) {
    return;
  }
  try {
    const token = await tokenStore.get().catch(() => null);
    if (!token) {
      return;
    }
    await retryPendingConsent({ life, client, hasSession: true, online: true, onUnauthorized: () => Promise.resolve() });
  } catch {
    // Queda pendiente.
  }
}

async function openFromServer(
  deps: Deps,
  payload: { token: string; account: { id: number; name: string; email: string } },
): Promise<AuthOutcome> {
  const { life, tokenStore } = deps;
  // Solo si es otra cuenta: la revocación de la misma cuenta la envía la sincronización normal.
  const departing = life.currentUser();
  if (departing && String(payload.account.id) !== departing.id) {
    await deliverPendingRevoke(deps);
  }
  // Mientras dura el cambio no se envía nada: la cola y el token no deben mezclar cuentas.
  // La marca es durable: si el sistema mata la app a mitad, la tarea en segundo plano no la ignora.
  await tokenStore.setTransition(true).catch(() => undefined);
  life.beginSessionChange();
  try {
    const opened = life.openServerSession(payload.account);
    if (opened.status === 'needs_confirmation') {
      // El token nuevo no se guarda hasta confirmar: la cola de la otra cuenta no debe enviarse con él.
      return {
        errors: {},
        confirmation: {
          pendingCount: opened.pendingCount,
          undeliveredRevoke: opened.undeliveredRevoke,
          confirm: async () => {
            await deliverPendingRevoke(deps);
            life.beginSessionChange();
            try {
              // Primero se borra y se abre la sesión; el token nuevo se guarda al final, aún bajo bloqueo.
              const result = life.openServerSession(payload.account, { confirmed: true });
              await tokenStore.set(payload.token, String(payload.account.id));
              const notices = sessionNotices(
                tokenStore,
                result.status === 'ok' && result.switched,
                result.status === 'ok' && result.undeliveredRevoke,
              );
              return { errors: {}, ...(notices.length > 0 ? { notices } : {}) };
            } finally {
              life.endSessionChange();
            }
          },
          cancel: () => Promise.resolve(),
        },
      };
    }
    // Sesión abierta y token guardado como una sola operación, bajo bloqueo del envío.
    await tokenStore.set(payload.token, String(payload.account.id));
    const notices = sessionNotices(tokenStore, opened.switched, opened.undeliveredRevoke);
    return { errors: {}, ...(notices.length > 0 ? { notices } : {}) };
  } finally {
    life.endSessionChange();
    await tokenStore.setTransition(false).catch(() => undefined);
  }
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
export async function logoutSession(deps: Deps): Promise<{ undeliveredRevoke: boolean }> {
  const { life, client, tokenStore } = deps;
  try {
    // Una revocación ya pendiente se entrega con el token vigente, antes de invalidarlo.
    // Con la compartición activa NO se revoca nada: cerrar sesión no es revocar.
    await deliverPendingRevoke(deps);
    const token = await tokenStore.get().catch(() => null);
    if (client && token) {
      await client.logout();
    }
  } catch {
    // Mejor esfuerzo.
  } finally {
    await tokenStore.clear().catch(() => undefined);
    // Si no se entregó, life.logout() la pasa al registro por cuenta: sobrevive y se reenvía
    // la próxima vez que inicie sesión esa misma cuenta.
    life.logout();
  }
  return { undeliveredRevoke: life.hasUndeliveredRevoke() };
}
