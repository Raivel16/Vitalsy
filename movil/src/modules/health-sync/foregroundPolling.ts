/** Cadencia de lectura con la app abierta. En segundo plano manda la tarea de 15 min. */
export const FOREGROUND_POLL_INTERVAL_MS = 60_000;

/** Parte de `AppState` que necesita el sondeo (se inyecta para probarlo sin React Native). */
export type AppStateApi = {
  currentState: string;
  addEventListener: (event: 'change', handler: (state: string) => void) => { remove: () => void };
};

export type ForegroundPollingDeps = {
  /** Una lectura silenciosa (sin diálogos). Puede fallar: el sondeo sigue. */
  run: () => Promise<unknown>;
  appState: AppStateApi;
  intervalMs?: number;
};

/**
 * Lee mientras la app está en primer plano: al activarse y luego cada `intervalMs`.
 * Se pausa en segundo plano y no solapa lecturas. Devuelve la función que lo detiene.
 */
export function startForegroundHealthPolling({ run, appState, intervalMs = FOREGROUND_POLL_INTERVAL_MS }: ForegroundPollingDeps): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      await run();
    } catch {
      // Una lectura fallida no detiene el sondeo: el siguiente tick reintenta.
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (timer) {
      return;
    }
    void tick();
    timer = setInterval(() => void tick(), intervalMs);
  };

  const pause = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  if (appState.currentState === 'active') {
    start();
  }
  const subscription = appState.addEventListener('change', (next) => (next === 'active' ? start() : pause()));

  return () => {
    pause();
    subscription.remove();
  };
}
