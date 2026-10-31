import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { BiometricSample } from '../health-sync/domain/types';
import { useLife } from '../life/LifeProvider';
import { BandController, type BandView } from './bandController';
import { getBandClient, requestBlePermissions } from './bandNative';
import { bandStore } from './bandStore';

/** Con la app abierta y la banda desconectada, se reintenta cada 30 s. */
const RECONNECT_INTERVAL_MS = 30_000;

const BandContext = createContext<{ view: BandView; controller: BandController } | null>(null);

export function BandProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { ready, life, refresh, syncServer, setBandPaired } = useLife();

  // Hasta que el efecto conecta los destinos, nada se guarda (la banda conserva sus datos).
  const [controller] = useState(
    () =>
      new BandController({
        client: getBandClient(),
        store: bandStore,
        requestPermissions: requestBlePermissions,
        apply: async () => false,
        onPairedChange: () => undefined,
        currentAccount: () => null,
      }),
  );
  const accountId = life.currentUser()?.id ?? null;
  // La instancia de LifeApp cambia al cargar del disco: el controlador siempre usa la última.
  useLayoutEffect(() => {
    controller.setHandlers({
      apply: async (samples: BiometricSample[], owner: string) => {
        // Se comprueba al guardar, no al empezar: la sesión pudo cambiar durante la descarga.
        // Si no se guarda, la banda conserva los datos.
        if (life.sessionChanging || life.currentUser()?.id !== owner) {
          return false;
        }
        life.addSamples(samples);
        await refresh();
        void syncServer();
        return true;
      },
      onPairedChange: setBandPaired,
      currentAccount: () => life.currentUser()?.id ?? null,
    });
  }, [controller, life, refresh, syncServer, setBandPaired]);
  const view = useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.view,
  );

  // Al arrancar y con cada cambio de cuenta: carga la banda de esa cuenta (la de otra se desconecta) y se
  // conecta. Al volver a primer plano y cada 30 s, reintenta.
  useEffect(() => {
    if (!ready || !view.available) {
      return;
    }
    void controller.sessionChanged();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void controller.reconnect();
      }
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && controller.view.connection === 'disconnected') {
        void controller.reconnect();
      }
    }, RECONNECT_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [ready, view.available, controller, accountId]);

  const value = useMemo(() => ({ view, controller }), [view, controller]);
  return <BandContext.Provider value={value}>{children}</BandContext.Provider>;
}

export function useBand(): { view: BandView; controller: BandController } {
  const value = useContext(BandContext);
  if (!value) {
    throw new Error('useBand debe usarse dentro de BandProvider');
  }
  return value;
}
