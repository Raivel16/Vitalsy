import * as Network from 'expo-network';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiBaseUrl, createLifeClient, type LifeClient } from '../../shared/api/lifeClient';
import { tokenStore, type TokenStore } from '../../shared/api/tokenStore';
import { singleFlight } from '../../shared/async/singleFlight';
import { AppState } from 'react-native';
import { activatePlan } from './activatePlan';
import { changeSharing, issueServerLinkCode, type LinkCodeOutcome, type SharingOutcome } from './consentSync';
import { needsResync, runSync } from './syncRunner';
import { randomHex } from '../../shared/crypto/randomHex';
import { sha256Hex } from '../../shared/crypto/sha256';
import { openLifePersistence } from '../../shared/storage/openLifePersistence';
import type { LifePersistence } from '../../shared/storage/persistence';
import { clearForegroundRuntime, setForegroundRuntime } from '../health-sync/backgroundSync';
import { setHealthBackgroundSync } from '../health-sync/backgroundScheduling';
import { collectAndEnqueue } from '../health-sync/collectAndEnqueue';
import { createHealthSource } from '../health-sync/createHealthSource';
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
  /** Hay un token guardado (la cola puede enviarse). */
  hasSession: boolean;
  health: HealthFeedback;
  refresh: () => Promise<void>;
  syncHealth: () => Promise<string | null>;
  activateFromCode: (raw: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Activa/revoca la compartición; la revocación llega al servidor o queda pendiente de forma honesta. */
  changeSharing: (enabled: boolean) => Promise<SharingOutcome>;
  /** Pide el código de vinculación al servidor (nunca lo genera localmente). */
  issueLinkCode: () => Promise<LinkCodeOutcome>;
  /** Cliente autenticado de /api/v1/life (null si la API no está configurada o no es https). */
  client: LifeClient | null;
  tokenStore: TokenStore;
};

const LifeContext = createContext<LifeContextValue | null>(null);

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
  // La red puede volver mientras una sincronización está en curso: se lee al usarla, no al arrancar.
  const onlineRef = useRef(online);
  useLayoutEffect(() => {
    onlineRef.current = online;
  }, [online]);
  const [hasSession, setHasSession] = useState(false);
  const client = useMemo(() => {
    const baseUrl = apiBaseUrl();
    return baseUrl ? createLifeClient(baseUrl, () => tokenStore.get()) : null;
  }, []);

  const clientRef = useRef(client);
  useLayoutEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    let active = true;
    if (persistence || initial) {
      return;
    }
    void (async () => {
      try {
        const sqlite = await openLifePersistence();
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

  useEffect(() => {
    let active = true;
    void tokenStore.get().then((token) => active && setHasSession(Boolean(token)), () => undefined);
    return () => {
      active = false;
    };
  }, [ready]);

  const refresh = useCallback(async () => {
    setTick((value) => value + 1);
    const network = await Network.getNetworkStateAsync().catch(() => null);
    onlineRef.current = Boolean(network?.isConnected);
    setOnline(onlineRef.current);
    setHasSession(Boolean(await tokenStore.get().catch(() => null)));
    if (store) {
      await store.save(life.state);
    }
  }, [life, store]);

  const syncHealthOnce = useCallback(async () => {
    const collected = await collectAndEnqueue({
      source: createHealthSource(),
      life,
      now: () => new Date(),
      interactive: true,
    });
    if (collected.status !== 'read') {
      if (collected.status !== 'stale_session') {
        setHealth({ status: collected.health, permission: collected.permission });
      }
      await refresh();
      return collected.message;
    }
    setHealth({ status: collected.health, permission: collected.permission });
    try {
      await serverSyncRef.current();
    } finally {
      await refresh();
    }
    return collected.message;
  }, [life, refresh]);

  // Envío de cola, reintento de revocación y avisos del servidor. Una sola ejecución a la vez.
  const serverSyncOnce = useCallback(async () => {
    try {
      const hasSession = Boolean(await tokenStore.get().catch(() => null));
      const usedOnline = onlineRef.current;
      await runSync({ life, client: clientRef.current, online: usedOnline, hasSession, onUnauthorized: () => tokenStore.clear() });
      if (needsResync(usedOnline, onlineRef.current)) {
        await runSync({ life, client: clientRef.current, online: true, hasSession, onUnauthorized: () => tokenStore.clear() });
      }
    } finally {
      await refresh();
    }
  }, [life, refresh]);
  const serverSyncImplRef = useRef(serverSyncOnce);
  useLayoutEffect(() => {
    serverSyncImplRef.current = serverSyncOnce;
  }, [serverSyncOnce]);
  const serverSync = useMemo(() => singleFlight(() => serverSyncImplRef.current()), []);
  const serverSyncRef = useRef(serverSync);
  useLayoutEffect(() => {
    serverSyncRef.current = serverSync;
  }, [serverSync]);

  // Dos disparos concurrentes (efecto de red + botón) comparten una sola ejecución.
  const syncImplRef = useRef(syncHealthOnce);
  useLayoutEffect(() => {
    syncImplRef.current = syncHealthOnce;
  }, [syncHealthOnce]);
  const syncHealth = useMemo(() => singleFlight(() => syncImplRef.current()), []);

  const wasOnline = useRef(true);
  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!wasOnline.current && online) {
      void syncHealth();
      void serverSync();
    }
    wasOnline.current = online;
  }, [online, ready, syncHealth, serverSync]);

  // Al abrir la app y al volver a primer plano: revocación pendiente, cola y avisos del servidor.
  useEffect(() => {
    if (!ready) {
      return;
    }
    void serverSync();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void serverSync();
      }
    });
    return () => subscription.remove();
  }, [ready, serverSync]);

  // La tarea en segundo plano reutiliza esta instancia (mismo runtime JS) para no pisarla desde disco.
  useEffect(() => {
    if (!ready) {
      return;
    }
    setForegroundRuntime({
      life,
      persist: async () => {
        await store?.save(life.state);
      },
      notify: () => setTick((value) => value + 1),
    });
    return () => clearForegroundRuntime();
  }, [ready, life, store]);

  // Con sesión y permiso de lectura se programa la lectura periódica; al cerrar sesión se da de baja.
  const backgroundEnabled = hasSession && life.state.healthSync.accessGranted;
  useEffect(() => {
    if (!ready) {
      return;
    }
    void setHealthBackgroundSync(backgroundEnabled);
  }, [ready, backgroundEnabled]);

  const consentDeps = useCallback(async () => {
    const session = Boolean(await tokenStore.get().catch(() => null));
    return {
      life,
      client,
      hasSession: session,
      online: onlineRef.current,
      onUnauthorized: () => tokenStore.clear(),
      // La revocación se guarda antes de la llamada de red: si matan la app, no se pierde el toque.
      persist: async () => {
        await store?.save(life.state);
      },
    };
  }, [client, life, store]);

  const changeSharingNow = useCallback(
    async (enabled: boolean) => {
      const result = await changeSharing(enabled, await consentDeps());
      await refresh();
      return result;
    },
    [consentDeps, refresh],
  );

  const issueLinkCodeNow = useCallback(async () => {
    const result = await issueServerLinkCode(await consentDeps());
    await refresh();
    return result;
  }, [consentDeps, refresh]);

  const activateFromCode = useCallback(
    async (raw: string) => {
      const hasSession = Boolean(await tokenStore.get().catch(() => null));
      const result = await activatePlan(raw, { life, client, hasSession, onUnauthorized: () => tokenStore.clear() });
      await refresh();
      return result;
    },
    [client, life, refresh],
  );

  const value = useMemo(
    () => ({
      ready,
      life,
      online,
      hasSession,
      health,
      refresh,
      syncHealth,
      activateFromCode,
      changeSharing: changeSharingNow,
      issueLinkCode: issueLinkCodeNow,
      client,
      tokenStore,
    }),
    [ready, life, online, hasSession, health, refresh, syncHealth, activateFromCode, changeSharingNow, issueLinkCodeNow, client, tick],
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
