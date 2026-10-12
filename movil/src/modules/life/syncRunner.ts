import type { LifeClient } from '../../shared/api/lifeClient';
import { chunkForSend } from '../health-sync/domain/syncQueue';
import { retryPendingConsent } from './consentSync';
import type { LifeApp } from './lifeApp';

type Deps = {
  life: LifeApp;
  client: LifeClient | null;
  online: boolean;
  hasSession: boolean;
  onUnauthorized: () => Promise<void>;
  now?: () => string;
};

/** Si arrancó sin red y la red volvió durante la ejecución, hay que reintentar una vez. */
export function needsResync(onlineUsed: boolean, onlineNow: boolean): boolean {
  return !onlineUsed && onlineNow;
}

/** Envía la cola por lotes. Devuelve true si el servidor respondió 401 (la sesión se limpió). */
async function flushQueue({ life, client, online, hasSession, onUnauthorized, now }: Required<Deps>): Promise<boolean> {
  const decision = life.flushDecision(online, Boolean(client), hasSession);
  if (!client || decision.send.length === 0) {
    return false;
  }
  const epoch = life.sessionEpoch;
  for (const chunk of chunkForSend(decision.send)) {
    // Si la sesión cambió (otra cuenta, o confirmación en curso) esta cola ya no es de quien tiene el token.
    if (life.sessionChanging || life.sessionEpoch !== epoch) {
      return false;
    }
    try {
      const result = await client.sync(chunk);
      if (!result.ok) {
        if (result.status === 401) {
          await onUnauthorized();
          return true;
        }
        return false;
      }
      life.applySyncResult(result.data.accepted, result.data.rejected, now());
    } catch {
      return false;
    }
  }
  return false;
}

async function pullNotices({ life, client, onUnauthorized }: Required<Deps>): Promise<void> {
  if (!client || typeof client.getNotices !== 'function') {
    return;
  }
  try {
    const result = await client.getNotices();
    if (result.ok) {
      life.mergeServerNotices(result.data.notices);
    } else if (result.status === 401) {
      await onUnauthorized();
    }
  } catch {
    // Los avisos locales siguen funcionando sin servidor.
  }
}

/**
 * Sincroniza con el servidor: reintenta una revocación pendiente, envía la cola pendiente
 * por lotes y trae los avisos. Nunca lanza: un paso fallido (red, 401, 422, respuesta
 * inválida o excepción) deja sus datos pendientes; lo ya aplicado se conserva.
 */
export async function runSync({ life, client, online, hasSession, onUnauthorized, now = () => new Date().toISOString() }: Deps): Promise<void> {
  if (!client || !online || !hasSession || life.sessionChanging) {
    // Sin servidor/red/sesión nada se envía; la cola y la revocación pendiente se conservan.
    return;
  }
  const deps = { life, client, online, hasSession, onUnauthorized, now };
  // La revocación va primero: es la que protege la privacidad de la persona.
  try {
    await retryPendingConsent({ life, client, online, hasSession, onUnauthorized });
  } catch {
    // Se reintentará en la siguiente sincronización.
  }
  const epoch = life.sessionEpoch;
  const unauthorized = await flushQueue(deps);
  if (!unauthorized && !life.sessionChanging && life.sessionEpoch === epoch) {
    await pullNotices(deps);
  }
}
