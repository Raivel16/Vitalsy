import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiBaseUrl, fetchDischargeBody, postLifeBatch } from '../../shared/api/lifeClient';
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
    const decision = life.flushDecision(online, Boolean(baseUrl));
    if (baseUrl && decision.send.length > 0) {
      const ok = await postLifeBatch(baseUrl, decision.send).catch(() => false);
      if (ok) {
        life.markQueueSynced(
          decision.send.map((item) => item.id),
          new Date().toISOString(),
        );
      }
    }
    await refresh();
    return read.message;
  }, [life, online, refresh]);

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
      const baseUrl = apiBaseUrl();
      const remote = baseUrl ? await fetchDischargeBody(baseUrl, raw.trim()).catch(() => null) : null;
      const result = life.activateDischarge(raw, remote);
      await refresh();
      return result;
    },
    [life, refresh],
  );

  const value = useMemo(
    () => ({ ready, life, online, health, refresh, syncHealth, activateFromCode }),
    [ready, life, online, health, refresh, syncHealth, activateFromCode, tick],
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
