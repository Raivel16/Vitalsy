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
      }),
  );
  // La instancia de LifeApp cambia al cargar del disco: el controlador siempre usa la última.
  useLayoutEffect(() => {
    controller.setHandlers({
      apply: async (samples: BiometricSample[]) => {
        if (!life.currentUser()) {
          return false; // sin cuenta abierta no se guarda: la banda conserva los datos
        }
        life.addSamples(samples);
        await refresh();
        void syncServer();
        return true;
      },
      onPairedChange: setBandPaired,
    });
  }, [controller, life, refresh, syncServer, setBandPaired]);
  const view = useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.view,
  );

  // Al arrancar: carga la banda vinculada y se conecta. Al volver a primer plano y cada 30 s, reintenta.
  useEffect(() => {
    if (!ready || !view.available) {
      return;
    }
    let active = true;
    void controller.load().then(() => (active ? controller.reconnect() : undefined));
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
      active = false;
      subscription.remove();
      clearInterval(timer);
    };
  }, [ready, view.available, controller]);

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
