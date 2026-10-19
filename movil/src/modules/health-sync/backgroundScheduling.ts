import { BACKGROUND_MIN_INTERVAL_MINUTES, HEALTH_BACKGROUND_TASK, type BackgroundOutcome } from './backgroundSync';

/** Subconjunto de expo-task-manager + expo-background-task. Inyectable para probar sin módulos nativos. */
export type BackgroundApi = {
  defineTask: (name: string, executor: () => Promise<unknown>) => void;
  registerTaskAsync: (name: string, options: { minimumInterval: number }) => Promise<void>;
  unregisterTaskAsync: (name: string) => Promise<void>;
  isTaskRegisteredAsync?: (name: string) => Promise<boolean>;
  /** Resultado que espera el planificador (BackgroundTaskResult.Success / Failed). */
  results: { success: unknown; failed: unknown };
};

export function loadBackgroundApi(): BackgroundApi | null {
  try {
    // Los módulos son nativos: en Expo Go (Android), web y pruebas pueden no estar; entonces no hay tarea.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const manager = require('expo-task-manager') as {
      defineTask: BackgroundApi['defineTask'];
      isTaskRegisteredAsync?: (name: string) => Promise<boolean>;
    };
    const background = require('expo-background-task') as {
      registerTaskAsync: BackgroundApi['registerTaskAsync'];
      unregisterTaskAsync: BackgroundApi['unregisterTaskAsync'];
      BackgroundTaskResult: { Success: unknown; Failed: unknown };
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
    return {
      defineTask: manager.defineTask,
      isTaskRegisteredAsync: manager.isTaskRegisteredAsync,
      registerTaskAsync: background.registerTaskAsync,
      unregisterTaskAsync: background.unregisterTaskAsync,
      results: { success: background.BackgroundTaskResult.Success, failed: background.BackgroundTaskResult.Failed },
    };
  } catch {
    return null;
  }
}

/** Debe llamarse en el ámbito global del bundle, no dentro de un componente. */
export function defineHealthBackgroundTask(run: () => Promise<BackgroundOutcome>, api: BackgroundApi | null = loadBackgroundApi()): boolean {
  if (!api) {
    return false;
  }
  try {
    api.defineTask(HEALTH_BACKGROUND_TASK, async () => ((await run()) === 'failed' ? api.results.failed : api.results.success));
    return true;
  } catch {
    return false;
  }
}

/** Registra (mínimo 15 min) o da de baja la tarea. Devuelve si el estado pedido quedó aplicado. */
export async function setHealthBackgroundSync(enabled: boolean, api: BackgroundApi | null = loadBackgroundApi()): Promise<boolean> {
  if (!api) {
    return false;
  }
  try {
    const registered = api.isTaskRegisteredAsync ? await api.isTaskRegisteredAsync(HEALTH_BACKGROUND_TASK) : null;
    if (enabled) {
      if (registered !== true) {
        await api.registerTaskAsync(HEALTH_BACKGROUND_TASK, { minimumInterval: BACKGROUND_MIN_INTERVAL_MINUTES });
      }
      return true;
    }
    if (registered !== false) {
      await api.unregisterTaskAsync(HEALTH_BACKGROUND_TASK);
    }
    return true;
  } catch {
    return false;
  }
}
