import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiBaseUrl, createLifeClient, type LifeClient } from '../../shared/api/lifeClient';
import { tokenStore, type TokenStore } from '../../shared/api/tokenStore';
import { chunkForSend } from '../health-sync/domain/syncQueue';
import { randomHex } from '../../shared/crypto/randomHex';
import { base64ToBytes, bytesToBase64 } from '../../shared/crypto/seal';
import { sha256Hex } from '../../shared/crypto/sha256';
import { SqlitePersistence } from '../../shared/storage/sqlitePersistence';
import type { LifePersistence } from '../../shared/storage/persistence';
import { createHealthSource } from '../health-sync/HealthConnectSource';
import type { HealthStatus } from '../health-sync/HealthDataSource';
import { emptySnapshot, LifeApp, type LifeSnapshot } from './lifeApp';

type HealthFeedback = {
  status: HealthStatus;
  permission: 'unknown' | 'granted' | 'denied';
};

type LifeContextValue = {
  ready: boolean;
  life: LifeApp;
  online: boolean;
  health: HealthFeedback;
  refresh: () => Promise<void>;
  syncHealth: () => Promise<string | null>;
  activateFromCode: (raw: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Cliente autenticado de /api/v1/life (null si la API no está configurada o no es https). */
  client: LifeClient | null;
  tokenStore: TokenStore;
};

const LifeContext = createContext<LifeContextValue | null>(null);

async function encryptionKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync('vitalsy.life.key');
  if (existing) {
    return base64ToBytes(existing);
  }
  const bytes = await Crypto.getRandomBytesAsync(32);
  await SecureStore.setItemAsync('vitalsy.life.key', bytesToBase64(bytes));
  return bytes;
}

export function LifeProvider({
  children,
  initial,
  persistence,
}: {
  children: ReactNode;
  initial?: LifeSnapshot;
  persistence?: LifePersistence;
}) {
  const [life, setLife] = useState(() => new LifeApp(initial ?? emptySnapshot(), { now: () => new Date(), random: randomHex, digest: sha256Hex }));
  const [ready, setReady] = useState(Boolean(initial || persistence));
  const [online, setOnline] = useState(true);
  const [store, setStore] = useState<LifePersistence | null>(persistence ?? null);
  const [health, setHealth] = useState<HealthFeedback>({
    status: { state: 'unavailable', message: 'Aún no consultamos Health Connect.' },
    permission: 'unknown',
  });
  const [tick, setTick] = useState(0);
  const client = useMemo(() => {
    const baseUrl = apiBaseUrl();
    return baseUrl ? createLifeClient(baseUrl, () => tokenStore.get()) : null;
  }, []);

  useEffect(() => {
    let active = true;
    if (persistence || initial) {
      return;
    }
    void (async () => {
      try {
        const key = await encryptionKey();
        const database = await SQLite.openDatabaseAsync('vitalsy-life.db');
        const sqlite = await SqlitePersistence.open(database, key, () => Crypto.getRandomBytes(12));
        const loaded = await sqlite.load();
        if (!active) {
          return;
        }
        setStore(sqlite);
        if (loaded) {
          setLife(new LifeApp(loaded, { now: () => new Date(), random: randomHex, digest: sha256Hex }));
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [initial, persistence]);

  const refresh = useCallback(async () => {
    setTick((value) => value + 1);
    const network = await Network.getNetworkStateAsync().catch(() => null);
    setOnline(Boolean(network?.isConnected));
    if (store) {
      await store.save(life.state);
    }
  }, [life, store]);

  const syncHealth = useCallback(async () => {
    const source = createHealthSource();
    const status = await source.availability();
    if (status.state !== 'available') {
      setHealth({ status, permission: 'unknown' });
      await refresh();
      return status.message;
    }
    const access = await source.requestAccess();
    if (!access.granted) {
      setHealth({ status, permission: 'denied' });
      await refresh();
      return access.message;
    }
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = new Date();
    const reader = source.readGranted?.bind(source) ?? source.readRange.bind(source);
    const read = await reader(from, to);
    life.addSamples(read.samples);
    setHealth({ status: { state: 'available', message: access.message }, permission: 'granted' });
    const baseUrl = apiBaseUrl();
    const hasSession = Boolean(await tokenStore.get().catch(() => null));
    const decision = life.flushDecision(online, Boolean(baseUrl), hasSession);
    if (client && decision.send.length > 0) {
      for (const chunk of chunkForSend(decision.send)) {
        const result = await client.sync(chunk);
        if (result.ok) {
          // Solo los ids aceptados pasan a synced; los rechazados quedan en estado terminal.
          life.applySyncResult(result.data.accepted, result.data.rejected, new Date().toISOString());
          continue;
        }
        if (result.status === 401) {
          await tokenStore.clear();
        }
        // Cualquier otro fallo (red, 422 batch_too_large, 5xx) deja los items pendientes para reintentar.
        break;
      }
    }
    await refresh();
    return read.message;
  }, [client, life, online, refresh]);

  const wasOnline = useRef(true);
  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!wasOnline.current && online) {
      void syncHealth();
    }
    wasOnline.current = online;
  }, [online, ready, syncHealth]);

  const activateFromCode = useCallback(
    async (raw: string) => {
      let remote: string | null = null;
      if (client) {
        const plan = await client.fetchDischargePlan(raw.trim());
        if (plan.ok) {
          remote = plan.data;
        } else if (plan.status === 401) {
          await tokenStore.clear();
        }
      }
      const result = life.activateDischarge(raw, remote);
      await refresh();
      return result;
    },
    [client, life, refresh],
  );

  const value = useMemo(
    () => ({ ready, life, online, health, refresh, syncHealth, activateFromCode, client, tokenStore }),
    [ready, life, online, health, refresh, syncHealth, activateFromCode, client, tick],
  );

  return <LifeContext.Provider value={value}>{children}</LifeContext.Provider>;
}

export function useLife(): LifeContextValue {
  const value = useContext(LifeContext);
  if (!value) {
    throw new Error('useLife debe usarse dentro de LifeProvider');
  }
  return value;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await import('expo-notifications');
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function scheduleMedicationReminder(title: string, body: string, dueAt: string): Promise<void> {
  const granted = await ensureNotificationPermission().catch(() => false);
  if (!granted) {
    return;
  }
  const Notifications = await import('expo-notifications');
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(dueAt) },
  }).catch(() => undefined);
}
