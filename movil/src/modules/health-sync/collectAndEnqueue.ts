import type { LifeApp } from '../life/lifeApp';
import type { HealthDataSource, HealthStatus } from './HealthDataSource';

/** Primera lectura (o lectura tras mucho tiempo): nunca más de 14 días hacia atrás. */
export const FIRST_READ_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
/** Los relojes suben datos con retraso; se relee un poco hacia atrás y el id determinista deduplica. */
export const OVERLAP_MS = 6 * 60 * 60 * 1000;

/** Ventana de lectura: solo el delta desde la última lectura completa, con tope de 14 días. */
export function readWindow(lastReadAt: string | null, now: Date): { from: Date; to: Date } {
  const earliest = now.getTime() - FIRST_READ_WINDOW_MS;
  const last = lastReadAt ? Date.parse(lastReadAt) : Number.NaN;
  const usable = Number.isFinite(last) && last <= now.getTime();
  const from = usable ? Math.max(earliest, last - OVERLAP_MS) : earliest;
  return { from: new Date(from), to: now };
}

type CollectLife = Pick<
  LifeApp,
  'addSamples' | 'markHealthAccess' | 'recordHealthRead' | 'sessionChanging' | 'sessionEpoch' | 'state'
>;

export type CollectDeps = {
  source: HealthDataSource;
  life: CollectLife;
  now: () => Date;
  /** true: primer plano, puede pedir permisos. false: segundo plano, nunca muestra un diálogo. */
  interactive: boolean;
};

export type CollectResult = {
  status: 'read' | 'unavailable' | 'denied' | 'no_permission' | 'stale_session';
  /** Estado de la fuente y de los permisos para la pantalla de dispositivos. */
  health: HealthStatus;
  permission: 'unknown' | 'granted' | 'denied';
  message: string | null;
  added: number;
  failed: boolean;
};

function result(partial: Partial<CollectResult> & Pick<CollectResult, 'status' | 'health'>): CollectResult {
  return { permission: 'unknown', message: null, added: 0, failed: false, ...partial };
}

/**
 * Camino único de lectura de salud, compartido por primer plano y segundo plano:
 * lee lo concedido desde la última lectura, lo encola en la instantánea y marca la lectura.
 * No envía nada al servidor: eso lo decide quien llama.
 */
export async function collectAndEnqueue({ source, life, now, interactive }: CollectDeps): Promise<CollectResult> {
  const health = await source.availability();
  if (health.state !== 'available') {
    return result({ status: 'unavailable', health, message: health.message });
  }
  if (life.sessionChanging) {
    return result({ status: 'stale_session', health });
  }

  let granted = life.state.healthSync.accessGranted;
  let accessMessage: string | null = null;
  if (interactive) {
    const access = await source.requestAccess();
    life.markHealthAccess(access.granted);
    if (!access.granted) {
      return result({ status: 'denied', health, permission: 'denied', message: access.message });
    }
    granted = true;
    accessMessage = access.message;
  }
  if (!granted) {
    return result({ status: 'no_permission', health });
  }
  // Sin lectura «sin permisos»: en segundo plano una fuente sin readGranted pediría diálogos.
  const reader = source.readGranted?.bind(source) ?? (interactive ? source.readRange.bind(source) : null);
  if (!reader) {
    return result({ status: 'no_permission', health });
  }

  const epoch = life.sessionEpoch;
  const { from, to } = readWindow(life.state.healthSync.lastReadAt, now());
  const read = await reader(from, to);
  if (life.sessionChanging || life.sessionEpoch !== epoch) {
    // Las lecturas son de la cuenta que ya no está activa: no se mezclan con la nueva.
    return result({ status: 'stale_session', health });
  }
  const added = life.addSamples(read.samples);
  const failed = Boolean(read.failed);
  if (!failed) {
    life.recordHealthRead(to.toISOString());
  }
  return result({
    status: 'read',
    health: interactive ? { state: 'available', message: accessMessage ?? health.message } : health,
    permission: 'granted',
    message: read.message,
    added,
    failed,
  });
}
