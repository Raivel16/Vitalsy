import type { LifeClient } from '../../shared/api/lifeClient';
import type { LifeApp } from './lifeApp';

type ConsentClient = Pick<LifeClient, 'setConsent' | 'issueLinkCode'>;

export type ConsentDeps = {
  life: LifeApp;
  /** null: la API no está configurada (modo solo en el teléfono). */
  client: ConsentClient | null;
  hasSession: boolean;
  online?: boolean;
  onUnauthorized: () => Promise<void>;
  /** Guarda el estado local. Se invoca antes de la llamada de red de una revocación (no perder el toque). */
  persist?: () => Promise<void>;
};

export type SharingOutcome = { ok: boolean; status: 'confirmed' | 'pending' | 'failed'; message: string };
export type LinkCodeOutcome = { ok: true; code: string; expiresAt: string } | { ok: false; message: string };

export const REVOKE_PENDING_MESSAGE = 'Se revocará en cuanto haya conexión.';
const SESSION_CHANGED_MESSAGE = 'La sesión cambió mientras tanto. Intenta de nuevo.';
const REVOKE_PENDING_NO_SESSION = 'Se revocará en cuanto inicies sesión y haya conexión.';

// Las llamadas de consentimiento se serializan: un reintento viejo nunca pisa un cambio más reciente.
let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(run: () => Promise<T>): Promise<T> {
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}

async function callSetConsent(client: ConsentClient, enabled: boolean) {
  try {
    return await client.setConsent(enabled);
  } catch {
    return { ok: false as const, status: 0, message: 'Sin conexión' };
  }
}

function canReachServer(deps: ConsentDeps): boolean {
  // Durante un cambio de sesión el token y la cuenta pueden no coincidir: no se envía nada.
  return deps.hasSession && deps.online !== false && !deps.life.sessionChanging;
}

async function attemptRevoke(deps: ConsentDeps): Promise<boolean> {
  const { life, client } = deps;
  if (!client || !canReachServer(deps) || !life.state.consentRevokePending) {
    return false;
  }
  const epoch = life.sessionEpoch;
  const result = await callSetConsent(client, false);
  if (life.sessionEpoch !== epoch) {
    // La sesión cambió durante la llamada: el pendiente ya no es de esta cuenta, no se toca.
    return false;
  }
  if (!result.ok) {
    if (result.status === 401) {
      await deps.onUnauthorized();
    }
    return false;
  }
  // Si mientras tanto se volvió a activar, ese cambio ya limpió el pendiente.
  if (life.state.consentRevokePending && !life.state.consent.sharingEnabled) {
    life.confirmRevoke();
  }
  return true;
}

/** Revocación local inmediata; el servidor se avisa de inmediato o queda un pendiente durable. */
export async function revokeSharing(deps: ConsentDeps): Promise<SharingOutcome> {
  const { life, client } = deps;
  life.revokeSharing(Boolean(client));
  try {
    await deps.persist?.();
  } catch {
    // Si no se pudo guardar, igual se intenta avisar al servidor.
  }
  if (!client) {
    return { ok: true, status: 'confirmed', message: 'La compartición quedó apagada y el código anterior ya no vale.' };
  }
  const confirmed = await serialize(() => attemptRevoke(deps));
  if (confirmed) {
    return { ok: true, status: 'confirmed', message: 'Accesos revocados. El código de vinculación dejó de ser válido.' };
  }
  return {
    ok: true,
    status: 'pending',
    message: `Compartición apagada en tu teléfono. ${deps.hasSession ? REVOKE_PENDING_MESSAGE : REVOKE_PENDING_NO_SESSION}`,
  };
}

export async function grantSharing(deps: ConsentDeps): Promise<SharingOutcome> {
  const { life, client } = deps;
  if (!client) {
    life.confirmSharing();
    return { ok: true, status: 'confirmed', message: 'La compartición quedó activa. El código se genera en el siguiente paso.' };
  }
  if (!deps.hasSession) {
    return { ok: false, status: 'failed', message: 'Inicia sesión para activar la compartición.' };
  }
  if (deps.online === false) {
    return { ok: false, status: 'failed', message: 'Sin conexión. Conéctate para activar la compartición.' };
  }
  const version = life.consentVersion;
  return serialize(async () => {
    const epoch = life.sessionEpoch;
    const result = await callSetConsent(client, true);
    if (life.sessionChanging || life.sessionEpoch !== epoch) {
      return { ok: false, status: 'failed', message: SESSION_CHANGED_MESSAGE } as SharingOutcome;
    }
    if (!result.ok) {
      if (result.status === 401) {
        await deps.onUnauthorized();
        return { ok: false, status: 'failed', message: 'Inicia sesión de nuevo para activar la compartición.' } as SharingOutcome;
      }
      const message =
        result.status === 0
          ? 'Sin conexión. Conéctate para activar la compartición.'
          : 'No se pudo activar la compartición ahora. Intenta de nuevo.';
      return { ok: false, status: 'failed', message } as SharingOutcome;
    }
    if (result.data?.sharingEnabled !== true) {
      return { ok: false, status: 'failed', message: 'El servidor no confirmó la compartición. Intenta de nuevo.' } as SharingOutcome;
    }
    if (life.consentVersion !== version) {
      // El usuario revocó mientras esperábamos: la revocación manda.
      return { ok: false, status: 'failed', message: 'La compartición se apagó antes de activarse.' } as SharingOutcome;
    }
    life.confirmSharing();
    return {
      ok: true,
      status: 'confirmed',
      message: 'La compartición quedó activa. El código se genera en el siguiente paso.',
    } as SharingOutcome;
  });
}

/** Reintenta una revocación pendiente. Seguro de llamar en cada sincronización. */
export async function retryPendingConsent(deps: ConsentDeps): Promise<void> {
  if (!deps.client || !deps.life.state.consentRevokePending || !canReachServer(deps)) {
    return;
  }
  await serialize(() => attemptRevoke(deps));
}

const SHARING_CLOSED = 'Activa la compartición con instituciones antes de generar un código.';

function linkCodeFailureMessage(result: { status: number; code?: string }): string {
  if (result.status === 401) {
    return 'Inicia sesión de nuevo para generar tu código.';
  }
  if (result.status === 0) {
    return 'Sin conexión. Conéctate para generar tu código.';
  }
  if (result.status === 409 || result.code === 'sharing_closed') {
    return SHARING_CLOSED;
  }
  if (result.status === 429) {
    return 'Demasiados intentos. Espera un minuto e intenta de nuevo.';
  }
  return 'No se pudo generar el código ahora. Intenta de nuevo.';
}

/** Emite el código en el servidor. Nunca genera un código local cuando hay API. */
export async function issueServerLinkCode(deps: ConsentDeps): Promise<LinkCodeOutcome> {
  const { life, client } = deps;
  if (!client) {
    return {
      ok: false,
      message: 'El código de vinculación solo funciona con el servidor del hospital, que esta app no tiene configurado.',
    };
  }
  if (!life.state.consent.sharingEnabled || life.state.consentRevokePending) {
    return { ok: false, message: SHARING_CLOSED };
  }
  if (!deps.hasSession) {
    return { ok: false, message: 'Inicia sesión para generar tu código.' };
  }
  if (deps.online === false) {
    return { ok: false, message: 'Sin conexión. Conéctate para generar tu código.' };
  }
  const version = life.consentVersion;
  const epoch = life.sessionEpoch;
  let result: Awaited<ReturnType<ConsentClient['issueLinkCode']>>;
  try {
    result = await client.issueLinkCode();
  } catch {
    return { ok: false, message: 'Sin conexión. Conéctate para generar tu código.' };
  }
  if (life.sessionChanging || life.sessionEpoch !== epoch) {
    // El código es de la cuenta anterior: no se muestra ni se guarda.
    return { ok: false, message: SESSION_CHANGED_MESSAGE };
  }
  if (!result.ok) {
    if (result.status === 401) {
      await deps.onUnauthorized();
    }
    return { ok: false, message: linkCodeFailureMessage(result) };
  }
  const { code, expiresAt } = result.data ?? ({} as { code?: string; expiresAt?: string });
  if (typeof code !== 'string' || !code || typeof expiresAt !== 'string') {
    return { ok: false, message: 'No se pudo generar el código ahora. Intenta de nuevo.' };
  }
  if (life.consentVersion !== version || !life.setServerLinkCode(code, expiresAt)) {
    return { ok: false, message: 'La compartición se apagó antes de mostrar el código. No se mostró ninguno.' };
  }
  return { ok: true, code, expiresAt };
}
