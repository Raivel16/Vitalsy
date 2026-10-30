import { Platform } from 'react-native';
import { mapHealthKitSamples, type HealthKitBundle, type HealthKitQuantity, type HealthKitSleep } from './domain/mapHealthKitSamples';
import type { HealthDataSource, HealthReadResult, HealthStatus } from './HealthDataSource';

type QuantitySampleLike = { startDate: Date | string; endDate: Date | string; quantity: number };
type CategorySampleLike = { startDate: Date | string; endDate: Date | string; value: number };
type QueryOptions = {
  /** Número no positivo: todas las muestras de la ventana. */
  limit: number;
  ascending?: boolean;
  unit?: string;
  filter?: { date: { startDate: Date; endDate: Date } };
};

/** Subconjunto de `@kingstinct/react-native-healthkit` que usa la app. Cada acceso nativo pasa por aquí. */
export type HealthKitModule = {
  isHealthDataAvailable(): boolean | Promise<boolean>;
  requestAuthorization(request: { toRead: string[]; toShare?: string[] }): Promise<boolean>;
  queryQuantitySamples(identifier: string, options: QueryOptions): Promise<readonly QuantitySampleLike[]>;
  queryCategorySamples(identifier: string, options: QueryOptions): Promise<readonly CategorySampleLike[]>;
};

export type HealthKitLoader = () => HealthKitModule | null;

const QUANTITIES = {
  heartRate: { id: 'HKQuantityTypeIdentifierHeartRate', unit: 'count/min' },
  restingHeartRate: { id: 'HKQuantityTypeIdentifierRestingHeartRate', unit: 'count/min' },
  hrvSdnn: { id: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', unit: 'ms' },
  oxygenSaturation: { id: 'HKQuantityTypeIdentifierOxygenSaturation', unit: '%' },
  steps: { id: 'HKQuantityTypeIdentifierStepCount', unit: 'count' },
  bodyTemperature: { id: 'HKQuantityTypeIdentifierBodyTemperature', unit: 'degC' },
} as const;

const SLEEP_ID = 'HKCategoryTypeIdentifierSleepAnalysis';

/** Solo lectura: nunca se piden tipos para escribir. */
export const HEALTHKIT_READ_TYPES: string[] = [...Object.values(QUANTITIES).map((entry) => entry.id), SLEEP_ID];

/** Una noche que cruza el inicio de la ventana se leería partida: se retrocede para tomarla entera. */
const SLEEP_LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** Una noche que termina hace menos de esto aún puede estar creciendo (el reloj sube segmentos tarde). */
const SLEEP_SETTLE_MS = 2 * 60 * 60 * 1000;

const UNAVAILABLE_MESSAGE = 'Requiere un development build en un iPhone.';

function loadNative(): HealthKitModule | null {
  try {
    // La librería es nativa: en Expo Go, web y pruebas el require falla y la fuente queda «no disponible».
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const imported = require('@kingstinct/react-native-healthkit') as Partial<HealthKitModule> & { default?: Partial<HealthKitModule> };
    const candidate = typeof imported.queryQuantitySamples === 'function' ? imported : imported.default;
    if (
      candidate &&
      typeof candidate.queryQuantitySamples === 'function' &&
      typeof candidate.queryCategorySamples === 'function' &&
      typeof candidate.requestAuthorization === 'function' &&
      typeof candidate.isHealthDataAvailable === 'function'
    ) {
      return candidate as HealthKitModule;
    }
    return null;
  } catch {
    return null;
  }
}

export const loadHealthKit: HealthKitLoader = loadNative;

export class HealthKitSource implements HealthDataSource {
  readonly name = 'Apple Health';

  constructor(
    private readonly loader: HealthKitLoader = loadHealthKit,
    private readonly os: string = Platform.OS,
  ) {}

  async availability(): Promise<HealthStatus> {
    if (this.os !== 'ios') {
      return { state: 'unavailable', message: 'Apple Health solo está disponible en iPhone.' };
    }
    try {
      const health = this.loader();
      if (!health) {
        return { state: 'unavailable', message: UNAVAILABLE_MESSAGE };
      }
      if (!(await health.isHealthDataAvailable())) {
        return { state: 'unavailable', message: 'Apple Health no está disponible en este dispositivo.' };
      }
      return { state: 'available', message: 'Apple Health está listo para leer los datos que autorices.' };
    } catch {
      return { state: 'error', message: 'No se pudo consultar Apple Health. La app sigue disponible para una lectura manual.' };
    }
  }

  async requestAccess(): Promise<{ granted: boolean; message: string }> {
    const status = await this.availability();
    if (status.state !== 'available') {
      return { granted: false, message: status.message };
    }
    try {
      const health = this.loader();
      if (!health) {
        return { granted: false, message: UNAVAILABLE_MESSAGE };
      }
      // Solo lectura. Apple no informa qué tipos concedió la persona; lo que no autorizó llega vacío.
      const processed = await health.requestAuthorization({ toRead: HEALTHKIT_READ_TYPES, toShare: [] });
      if (!processed) {
        return { granted: false, message: 'No concediste permisos de lectura en Apple Health.' };
      }
      return { granted: true, message: 'Solicitud de lectura enviada a Apple Health.' };
    } catch {
      return { granted: false, message: 'Apple Health rechazó la solicitud de permisos.' };
    }
  }

  async readRange(from: Date, to: Date): Promise<HealthReadResult> {
    const access = await this.requestAccess();
    if (!access.granted) {
      return { samples: [], message: access.message };
    }
    return this.readGranted(from, to);
  }

  async readGranted(from: Date, to: Date): Promise<HealthReadResult> {
    const health = this.loader();
    if (!health) {
      return { samples: [], message: UNAVAILABLE_MESSAGE, failed: true };
    }
    const filter = (start: Date) => ({ date: { startDate: start, endDate: to } });
    let queries = 0;
    let failures = 0;

    const quantity = async (key: keyof typeof QUANTITIES): Promise<HealthKitQuantity[]> => {
      queries += 1;
      try {
        const rows = await health.queryQuantitySamples(QUANTITIES[key].id, {
          limit: 0,
          ascending: true,
          unit: QUANTITIES[key].unit,
          filter: filter(from),
        });
        return rows.map((row) => ({ startDate: row.startDate, endDate: row.endDate, quantity: row.quantity }));
      } catch {
        failures += 1;
        return [];
      }
    };

    const sleep = async (): Promise<HealthKitSleep[]> => {
      queries += 1;
      try {
        const rows = await health.queryCategorySamples(SLEEP_ID, {
          limit: 0,
          ascending: true,
          filter: filter(new Date(from.getTime() - SLEEP_LOOKBACK_MS)),
        });
        return rows.map((row) => ({ startDate: row.startDate, endDate: row.endDate, value: Number(row.value) }));
      } catch {
        failures += 1;
        return [];
      }
    };

    const [heartRate, restingHeartRate, hrvSdnn, oxygenSaturation, steps, bodyTemperature, sleepRows] = await Promise.all([
      quantity('heartRate'),
      quantity('restingHeartRate'),
      quantity('hrvSdnn'),
      quantity('oxygenSaturation'),
      quantity('steps'),
      quantity('bodyTemperature'),
      sleep(),
    ]);
    if (failures === queries) {
      return { samples: [], message: 'No se pudieron leer los registros de Apple Health.', failed: true };
    }
    const bundle: HealthKitBundle = {
      heartRate,
      restingHeartRate,
      hrvSdnn,
      oxygenSaturation,
      steps,
      bodyTemperature,
      sleep: sleepRows,
    };
    const samples = mapHealthKitSamples(bundle, {
      sleepSettledBefore: new Date(to.getTime() - SLEEP_SETTLE_MS),
    });
    return {
      samples,
      message: samples.length === 0 ? 'Apple Health no tiene lecturas en este periodo.' : null,
      failed: failures > 0 ? true : undefined,
    };
  }
}
