import type { LifeClient } from '../../shared/api/lifeClient';
import type { TokenStore } from '../../shared/api/tokenStore';
import type { LifePersistence } from '../../shared/storage/persistence';
import type { LifeApp, LifeSnapshot } from '../life/lifeApp';
import { runSync } from '../life/syncRunner';
import { collectAndEnqueue } from './collectAndEnqueue';
import type { HealthDataSource } from './HealthDataSource';

/** Nombre único de la tarea (definición, registro y baja usan el mismo). */
export const HEALTH_BACKGROUND_TASK = 'vitalsy-life-health-sync';
/** Mínimo que permiten WorkManager (Android) y BGTaskScheduler (iOS). Es un mínimo, no una cadencia garantizada. */
export const BACKGROUND_MIN_INTERVAL_MINUTES = 15;

export type BackgroundSyncDeps = {
  source: HealthDataSource;
  persistence: LifePersistence;
  tokenStore: Pick<TokenStore, 'get' | 'clear'>;
  /** null: la API no está configurada. */
  client: LifeClient | null;
  now: () => Date;
  isOnline: () => Promise<boolean>;
  createLife: (snapshot: LifeSnapshot) => LifeApp;
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
 */
export async function runBackgroundHealthSync(deps: BackgroundSyncDeps): Promise<BackgroundOutcome> {
  try {
    if (!deps.client) {
      return 'noop';
    }
    const token = await deps.tokenStore.get().catch(() => null);
    if (!token) {
      return 'noop';
    }

    const runtime = foreground;
    let life: LifeApp;
    let persist: () => Promise<void>;
    if (runtime) {
      life = runtime.life;
      persist = runtime.persist;
    } else {
      const snapshot = await deps.persistence.load();
      if (!snapshot) {
        return 'noop';
      }
      life = deps.createLife(snapshot);
      persist = () => deps.persistence.save(life.state);
    }

    if (!life.state.sessionUserId || life.sessionChanging || !life.state.healthSync.accessGranted) {
      return 'noop';
    }

    const collected = await collectAndEnqueue({ source: deps.source, life, now: deps.now, interactive: false });
    if (collected.status !== 'read') {
      return 'noop';
    }
    await persist();

    const online = await deps.isOnline().catch(() => false);
    await runSync({
      life,
      client: deps.client,
      online,
      hasSession: true,
      onUnauthorized: () => deps.tokenStore.clear(),
    });
    await persist();
    runtime?.notify?.();
    return collected.failed ? 'failed' : 'success';
  } catch {
    return 'failed';
  }
}
