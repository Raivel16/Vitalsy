import type { BiometricSample } from '../health-sync/domain/types';
import type { BandClient } from './bandClient';
import type { BandStore } from './bandStore';
import { latestMinute, recordsToSamples, type MinuteRecord } from './domain/history';

export type HistoryClient = Pick<BandClient, 'connect' | 'downloadHistory' | 'ack' | 'disconnect'>;

/**
 * Guarda las muestras en la cuenta `ownerAccountId` (la que vinculó la banda) si sigue siendo la sesión
 * abierta. false: no se guardaron (la banda debe conservarlas).
 */
export type ApplySamples = (samples: BiometricSample[], ownerAccountId: string) => Promise<boolean>;

export type BandSyncDeps = {
  client: HistoryClient;
  store: BandStore;
  apply: ApplySamples;
};

/**
 * Guarda registros de la banda y, solo si se guardaron, confirma a la banda para que los borre.
 * Devuelve cuántas muestras se entregaron (0 si no se guardó nada).
 */
export async function applyBandRecords({ client, store, apply }: BandSyncDeps, records: MinuteRecord[]): Promise<number> {
  const paired = await store.get();
  const upTo = latestMinute(records);
  if (!paired?.accountId || upTo === null) {
    return 0;
  }
  const samples = recordsToSamples(records, paired.id);
  if (!(await apply(samples, paired.accountId))) {
    return 0;
  }
  await client.ack(upTo);
  await store.markSynced(upTo);
  return samples.length;
}

/** Descarga lo pendiente desde el último minuto confirmado. La banda debe estar conectada. */
export async function syncBandHistory(deps: BandSyncDeps): Promise<{ added: number; upTo: number | null }> {
  const paired = await deps.store.get();
  if (!paired) {
    return { added: 0, upTo: null };
  }
  const from = paired.lastMinute === null ? 0 : paired.lastMinute + 1;
  const records = await deps.client.downloadHistory(from);
  const added = await applyBandRecords(deps, records);
  return { added, upTo: added > 0 ? latestMinute(records) : null };
}

/** Lectura completa sin interfaz (segundo plano): conecta, sincroniza y desconecta siempre. */
export async function readBandOnce(deps: BandSyncDeps): Promise<'none' | 'read' | 'failed'> {
  const paired = await deps.store.get();
  if (!paired) {
    return 'none';
  }
  try {
    await deps.client.connect(paired.id, {});
    const { added } = await syncBandHistory(deps);
    return added > 0 ? 'read' : 'none';
  } catch {
    return 'failed';
  } finally {
    await deps.client.disconnect().catch(() => undefined);
  }
}
