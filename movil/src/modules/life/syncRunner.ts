import type { LifeClient } from '../../shared/api/lifeClient';
import { chunkForSend } from '../health-sync/domain/syncQueue';
import type { LifeApp } from './lifeApp';

type Deps = {
  life: LifeApp;
  client: LifeClient | null;
  online: boolean;
  hasSession: boolean;
  onUnauthorized: () => Promise<void>;
  now?: () => string;
};

/**
 * Envía la cola pendiente por lotes. Nunca lanza: un lote fallido (red, 401, 422,
 * respuesta inválida o excepción) deja sus items pendientes y corta el envío; los
 * lotes ya aplicados se conservan.
 */
export async function runSync({ life, client, online, hasSession, onUnauthorized, now = () => new Date().toISOString() }: Deps): Promise<void> {
  const decision = life.flushDecision(online, Boolean(client), hasSession);
  if (!client || decision.send.length === 0) {
    return;
  }
  for (const chunk of chunkForSend(decision.send)) {
    try {
      const result = await client.sync(chunk);
      if (!result.ok) {
        if (result.status === 401) {
          await onUnauthorized();
        }
        return;
      }
      life.applySyncResult(result.data.accepted, result.data.rejected, now());
    } catch {
      return;
    }
  }
}
