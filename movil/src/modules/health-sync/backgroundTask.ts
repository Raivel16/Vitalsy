import * as Network from 'expo-network';
import { apiBaseUrl, createLifeClient } from '../../shared/api/lifeClient';
import { tokenStore } from '../../shared/api/tokenStore';
import { randomHex } from '../../shared/crypto/randomHex';
import { sha256Hex } from '../../shared/crypto/sha256';
import { openLifePersistence } from '../../shared/storage/openLifePersistence';
import type { LifePersistence } from '../../shared/storage/persistence';
import { bandStore } from '../band/bandStore';
import { getBandClient, hasBlePermissions } from '../band/bandNative';
import { readBandOnce } from '../band/bandSync';
import { LifeApp, type LifeSnapshot } from '../life/lifeApp';
import { defineHealthBackgroundTask } from './backgroundScheduling';
import { runBackgroundBandSync, runBackgroundHealthSync, type BackgroundOutcome, type BandReader } from './backgroundSync';
import { createHealthSource } from './createHealthSource';

/** Banda vinculada (RF-113): sin cliente BLE o sin permisos ya concedidos no hay nada que leer. */
const readBand: BandReader = async (apply) => {
  const client = getBandClient();
  if (!client || !(await hasBlePermissions().catch(() => false))) {
    return 'none';
  }
  return readBandOnce({ client, store: bandStore, apply });
};

function combine(a: BackgroundOutcome, b: BackgroundOutcome): BackgroundOutcome {
  if (a === 'failed' || b === 'failed') {
    return 'failed';
  }
  return a === 'success' || b === 'success' ? 'success' : 'noop';
}

async function runDefault(): Promise<BackgroundOutcome> {
  try {
    let opened: ReturnType<typeof openLifePersistence> | null = null;
    const open = () => (opened ??= openLifePersistence());
    const baseUrl = apiBaseUrl();
    // Se abre solo si hace falta: sin sesión o sin API la tarea termina antes de tocar el disco.
    const persistence: LifePersistence = {
      load: async () => (await open()).load(),
      save: async (snapshot) => (await open()).save(snapshot),
      update: async (mutate) => (await open()).update(mutate),
    };
    const common = {
      persistence,
      tokenStore,
      client: baseUrl ? createLifeClient(baseUrl, () => tokenStore.get()) : null,
      now: () => new Date(),
      isOnline: async () => Boolean((await Network.getNetworkStateAsync()).isConnected),
      createLife: (snapshot: LifeSnapshot) => new LifeApp(snapshot, { now: () => new Date(), random: randomHex, digest: sha256Hex }),
    };
    // La banda primero: su envío deja la cola al día antes de leer Health Connect.
    const band = await runBackgroundBandSync({ ...common, readBand });
    const health = await runBackgroundHealthSync({ ...common, source: createHealthSource() });
    return combine(band, health);
  } catch {
    return 'failed';
  }
}

// Ámbito global: un arranque en segundo plano no monta ninguna vista, la tarea debe estar definida al cargar el bundle.
defineHealthBackgroundTask(runDefault);
