import type { LifeClient } from '../../shared/api/lifeClient';
import type { TokenStore } from '../../shared/api/tokenStore';
import type { LifePersistence } from '../../shared/storage/persistence';
import type { LifeApp, LifeSnapshot } from '../life/lifeApp';
import { runSync } from '../life/syncRunner';
import { chunkForSend } from './domain/syncQueue';
import type { BiometricSample } from './domain/types';
import { collectAndEnqueue } from './collectAndEnqueue';
import type { HealthDataSource } from './HealthDataSource';

/** Nombre único de la tarea (definición, registro y baja usan el mismo). */
export const HEALTH_BACKGROUND_TASK = 'vitalsy-life-health-sync';
/** Mínimo que permiten WorkManager (Android) y BGTaskScheduler (iOS). Es un mínimo, no una cadencia garantizada. */
export const BACKGROUND_MIN_INTERVAL_MINUTES = 15;

type SessionDeps = {
  persistence: LifePersistence;
  tokenStore: Pick<TokenStore, 'getBinding' | 'isTransitioning' | 'clear'>;
  /** null: la API no está configurada. */
  client: LifeClient | null;
  now: () => Date;
  isOnline: () => Promise<boolean>;
  createLife: (snapshot: LifeSnapshot) => LifeApp;
};

export type BackgroundSyncDeps = SessionDeps & {
  source: HealthDataSource;
};

/** Lee la banda vinculada (RF-113). `apply` guarda las muestras y responde si se guardaron. */
export type BandReader = (
  apply: (samples: BiometricSample[], ownerAccountId: string) => Promise<boolean>,
) => Promise<'none' | 'read' | 'failed'>;

export type BandBackgroundDeps = SessionDeps & {
  readBand: BandReader;
};

/** La app en primer plano (mismo runtime JS) expone su `LifeApp` para que la tarea no la pise desde disco. */
export type ForegroundRuntime = {
  life: LifeApp;
  persist: () => Promise<void>;
  notify?: () => void;
};

let foreground: ForegroundRuntime | null = null;

export function setForegroundRuntime(runtime: ForegroundRuntime): void {
  foreground = runtime;
}

export function clearForegroundRuntime(): void {
  foreground = null;
}

export type BackgroundOutcome = 'success' | 'noop' | 'failed';

/**
 * Lectura de salud sin interfaz: lee los datos ya concedidos desde la última lectura, los encola con
 * el mismo camino que el primer plano y solo envía si hay sesión. Nunca lanza y nunca pide permisos.
 *
 * En un arranque en frío `sessionChanging`/`sessionEpoch` valen 0 en memoria, así que la identidad se
 * comprueba con lo durable: el token guarda la cuenta, el teléfono guarda la cuenta de la instantánea y
 * una marca de «cambio de cuenta en curso». Solo se avanza si las tres cosas coinciden.
 * Las escrituras en frío son lee-modifica-escribe atómicas (`persistence.update`): nunca pisan una
 * instantánea más nueva (cola, revocaciones pendientes) escrita por la app mientras se leía o enviaba.
 */
export async function runBackgroundHealthSync(deps: BackgroundSyncDeps): Promise<BackgroundOutcome> {
  try {
    if (!deps.client) {
      return 'noop';
    }
    const binding = await deps.tokenStore.getBinding().catch(() => null);
    if (!binding?.accountId) {
      // Sin sesión, o un token anterior al vínculo con la cuenta: no se sabe de quién es.
      return 'noop';
    }
    if (await deps.tokenStore.isTransitioning().catch(() => true)) {
      return 'noop';
    }
    const accountId = binding.accountId;

    const runtime = foreground;
    if (runtime) {
      return await runInForeground(deps, runtime, accountId);
    }
    return await runCold(deps, accountId);
  } catch {
    return 'failed';
  }
}

async function runInForeground(deps: BackgroundSyncDeps, runtime: ForegroundRuntime, accountId: string): Promise<BackgroundOutcome> {
  const life = runtime.life;
  if (life.state.sessionUserId !== accountId || life.sessionChanging || !life.state.healthSync.accessGranted) {
    return 'noop';
  }
  const collected = await collectAndEnqueue({ source: deps.source, life, now: deps.now, interactive: false });
  if (collected.status !== 'read') {
    return 'noop';
  }
  await runtime.persist();
  const online = await deps.isOnline().catch(() => false);
  await runSync({
    life,
    client: deps.client,
    online,
    hasSession: true,
    onUnauthorized: () => deps.tokenStore.clear(),
  });
  await runtime.persist();
  runtime.notify?.();
  return collected.failed ? 'failed' : 'success';
}

async function sessionStillValid(deps: SessionDeps, accountId: string): Promise<boolean> {
  const binding = await deps.tokenStore.getBinding().catch(() => null);
  if (binding?.accountId !== accountId) {
    return false;
  }
  return !(await deps.tokenStore.isTransitioning().catch(() => true));
}

function recordingSource(deps: BackgroundSyncDeps, recorded: BiometricSample[]): HealthDataSource {
  const readGranted = deps.source.readGranted?.bind(deps.source);
  return {
    name: deps.source.name,
    availability: () => deps.source.availability(),
    requestAccess: () => deps.source.requestAccess(),
    readRange: (from, to) => deps.source.readRange(from, to),
    readGranted: readGranted
      ? async (from, to) => {
          const result = await readGranted(from, to);
          recorded.push(...result.samples);
          return result;
        }
      : undefined,
  };
}

/** Se aplica sobre lo ÚLTIMO guardado, no sobre la copia leída al empezar. Devuelve false si la cuenta cambió. */
async function applyRead(
  deps: SessionDeps,
  accountId: string,
  recorded: BiometricSample[],
  recordRead: string | null,
): Promise<boolean> {
  let applied = false;
  await deps.persistence.update((latest) => {
    if (latest?.sessionUserId !== accountId) {
      return null;
    }
    const life = deps.createLife(latest);
    life.addSamples(recorded);
    if (recordRead) {
      life.recordHealthRead(recordRead);
    }
    applied = true;
    return life.state;
  });
  return applied;
}

type ChunkResults = { accepted: string[]; rejected: Array<{ id: string; reason: string }>; unauthorized: boolean };

async function sendChunks(
  deps: SessionDeps,
  accountId: string,
  client: LifeClient,
  send: Parameters<typeof chunkForSend>[0],
): Promise<ChunkResults> {
  const results: ChunkResults = { accepted: [], rejected: [], unauthorized: false };
  for (const chunk of chunkForSend(send)) {
    if (!(await sessionStillValid(deps, accountId))) {
      break;
    }
    // Antes de CADA lote se relee lo último guardado: una revocación (o un cambio de cuenta) hecha
    // por la app entre lotes detiene el resto del envío.
    const fresh = await deps.persistence.load();
    if (fresh?.sessionUserId !== accountId || fresh.consentRevokePending) {
      break;
    }
    try {
      const result = await client.sync(chunk);
      if (!result.ok) {
        results.unauthorized = result.status === 401;
        break;
      }
      results.accepted.push(...result.data.accepted);
      results.rejected.push(...result.data.rejected);
    } catch {
      break;
    }
  }
  return results;
}

async function sendPending(deps: SessionDeps, accountId: string, client: LifeClient): Promise<void> {
  if (!(await sessionStillValid(deps, accountId))) {
    return;
  }
  const latest = await deps.persistence.load();
  if (latest?.sessionUserId !== accountId || latest.consentRevokePending) {
    return;
  }
  const decision = deps.createLife(latest).flushDecision(true, true, true);
  const { accepted, rejected, unauthorized } = await sendChunks(deps, accountId, client, decision.send);
  if (accepted.length > 0 || rejected.length > 0) {
    const syncedAt = deps.now().toISOString();
    await deps.persistence.update((current) => {
      if (current?.sessionUserId !== accountId) {
        return null;
      }
      const merged = deps.createLife(current);
      merged.applySyncResult(accepted, rejected, syncedAt);
      return merged.state;
    });
  }
  if (unauthorized) {
    await deps.tokenStore.clear();
  }
}

async function runCold(deps: BackgroundSyncDeps, accountId: string): Promise<BackgroundOutcome> {
  const snapshot = await deps.persistence.load();
  if (snapshot?.sessionUserId !== accountId || !snapshot.healthSync.accessGranted) {
    return 'noop';
  }
  const scratch = deps.createLife(snapshot);
  const recorded: BiometricSample[] = [];
  const collected = await collectAndEnqueue({
    source: recordingSource(deps, recorded),
    life: scratch,
    now: deps.now,
    interactive: false,
  });
  if (collected.status !== 'read') {
    return 'noop';
  }
  const lastReadAt = scratch.state.healthSync.lastReadAt;

  const recordRead = !collected.failed && lastReadAt ? lastReadAt : null;
  if (!(await applyRead(deps, accountId, recorded, recordRead))) {
    return 'noop';
  }

  const online = await deps.isOnline().catch(() => false);
  if (online && deps.client) {
    await sendPending(deps, accountId, deps.client);
  }
  return collected.failed ? 'failed' : 'success';
}

/**
 * Lectura de la banda Vitalsy sin interfaz (RF-113): mismas garantías de cuenta que la lectura de salud,
 * pero no depende del permiso de Health Connect. Con la app abierta no hace nada: la app ya está
 * conectada a la banda y una segunda conexión la cortaría.
 */
export async function runBackgroundBandSync(deps: BandBackgroundDeps): Promise<BackgroundOutcome> {
  try {
    if (!deps.client || foreground) {
      return 'noop';
    }
    const binding = await deps.tokenStore.getBinding().catch(() => null);
    if (!binding?.accountId || (await deps.tokenStore.isTransitioning().catch(() => true))) {
      return 'noop';
    }
    const accountId = binding.accountId;
    const snapshot = await deps.persistence.load();
    if (snapshot?.sessionUserId !== accountId) {
      return 'noop';
    }
    // La banda solo borra lo enviado si `apply` confirma que quedó guardado en esta cuenta.
    // Una banda vinculada por otra cuenta de este teléfono no se guarda aquí.
    const outcome = await deps.readBand(async (samples, owner) => owner === accountId && applyRead(deps, accountId, samples, null));
    if (outcome !== 'read') {
      return outcome === 'failed' ? 'failed' : 'noop';
    }
    const online = await deps.isOnline().catch(() => false);
    if (online) {
      await sendPending(deps, accountId, deps.client);
    }
    return 'success';
  } catch {
    return 'failed';
  }
}
