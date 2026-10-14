import * as Network from 'expo-network';
import { apiBaseUrl, createLifeClient } from '../../shared/api/lifeClient';
import { tokenStore } from '../../shared/api/tokenStore';
import { randomHex } from '../../shared/crypto/randomHex';
import { sha256Hex } from '../../shared/crypto/sha256';
import { openLifePersistence } from '../../shared/storage/openLifePersistence';
import { LifeApp } from '../life/lifeApp';
import { defineHealthBackgroundTask } from './backgroundScheduling';
import { runBackgroundHealthSync, type BackgroundOutcome } from './backgroundSync';
import { createHealthSource } from './createHealthSource';

async function runDefault(): Promise<BackgroundOutcome> {
  try {
    let opened: ReturnType<typeof openLifePersistence> | null = null;
    const open = () => (opened ??= openLifePersistence());
    const baseUrl = apiBaseUrl();
    return await runBackgroundHealthSync({
      source: createHealthSource(),
      // Se abre solo si hace falta: sin sesión o sin API la tarea termina antes de tocar el disco.
      persistence: {
        load: async () => (await open()).load(),
        save: async (snapshot) => (await open()).save(snapshot),
      },
      tokenStore,
      client: baseUrl ? createLifeClient(baseUrl, () => tokenStore.get()) : null,
      now: () => new Date(),
      isOnline: async () => Boolean((await Network.getNetworkStateAsync()).isConnected),
      createLife: (snapshot) => new LifeApp(snapshot, { now: () => new Date(), random: randomHex, digest: sha256Hex }),
    });
  } catch {
    return 'failed';
  }
}

// Ámbito global: un arranque en segundo plano no monta ninguna vista, la tarea debe estar definida al cargar el bundle.
defineHealthBackgroundTask(runDefault);
