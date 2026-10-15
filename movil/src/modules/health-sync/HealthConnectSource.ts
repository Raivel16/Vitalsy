import { Linking, Platform } from 'react-native';
import { mapHealthConnectRecords, type HealthConnectBundle } from './domain/mapHealthRecords';
import type { HealthDataSource, HealthReadResult, HealthStatus } from './HealthDataSource';

const READS = [
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariabilityRmssd',
  'OxygenSaturation',
  'Steps',
  'SleepSession',
  'SkinTemperature',
  'BodyTemperature',
] as const;

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

export type HealthModule = {
  getSdkStatus: () => Promise<number>;
  initialize: () => Promise<boolean>;
  requestPermission: (permissions: Array<{ accessType: 'read'; recordType: string }>) => Promise<unknown[]>;
  readRecords: (
    recordType: string,
    options: {
      timeRangeFilter: { operator: 'between'; startTime: string; endTime: string };
      pageSize?: number;
      pageToken?: string;
    },
  ) => Promise<{ records: Array<Record<string, unknown>>; pageToken?: string }>;
  SdkAvailabilityStatus: { SDK_AVAILABLE: number; SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: number };
};

async function loadModule(): Promise<HealthModule> {
  const imported = (await import('react-native-health-connect')) as unknown as HealthModule;
  return imported;
}

const PAGE_SIZE = 1000;
/** Tope de seguridad: 50 000 registros por tipo en una ventana de hasta 14 días. Si se alcanza, la lectura cuenta como incompleta. */
const MAX_PAGES = 50;
/** Solo existe en Health Connect reciente: que falle por sí sola no invalida el resto de la lectura. */
const OPTIONAL_READS = new Set<string>(['SkinTemperature']);

type TimeRange = { operator: 'between'; startTime: string; endTime: string };

async function readAllPages(health: HealthModule, recordType: string, timeRangeFilter: TimeRange): Promise<Array<Record<string, unknown>>> {
  const records: Array<Record<string, unknown>> = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await health.readRecords(recordType, { timeRangeFilter, pageSize: PAGE_SIZE, ...(pageToken ? { pageToken } : {}) });
    records.push(...(result.records ?? []));
    if (!result.pageToken) {
      return records;
    }
    pageToken = result.pageToken;
  }
  throw new Error('page cap reached');
}

function celsius(record: Record<string, unknown>): number | null {
  const candidates = [record.temperature, record.baseline];
  for (const candidate of candidates) {
    const temperature = candidate as { inCelsius?: number; value?: number; unit?: string } | undefined;
    if (typeof temperature?.inCelsius === 'number') {
      return temperature.inCelsius;
    }
    if (typeof temperature?.value === 'number' && temperature.unit !== 'fahrenheit') {
      return temperature.value;
    }
  }
  return null;
}

function toBundle(kind: (typeof READS)[number], records: Array<Record<string, unknown>>): HealthConnectBundle {
  if (kind === 'HeartRate') {
    return {
      heartRate: records.map((record) => ({
        startTime: String(record.startTime),
        endTime: String(record.endTime),
        samples: ((record.samples as Array<{ time: string; beatsPerMinute: number }> | undefined) ?? []).map((sample) => ({
          time: sample.time,
          beatsPerMinute: sample.beatsPerMinute,
        })),
      })),
    };
  }
  if (kind === 'RestingHeartRate') {
    return {
      restingHeartRate: records
        .filter((record) => typeof record.beatsPerMinute === 'number')
        .map((record) => ({ time: String(record.time), beatsPerMinute: Number(record.beatsPerMinute) })),
    };
  }
  if (kind === 'HeartRateVariabilityRmssd') {
    return {
      hrv: records
        .filter((record) => typeof record.heartRateVariabilityMillis === 'number')
        .map((record) => ({
          time: String(record.time),
          heartRateVariabilityMillis: Number(record.heartRateVariabilityMillis),
        })),
    };
  }
  if (kind === 'OxygenSaturation') {
    return {
      oxygenSaturation: records
        .filter((record) => typeof record.percentage === 'number')
        .map((record) => ({ time: String(record.time), percentage: Number(record.percentage) })),
    };
  }
  if (kind === 'Steps') {
    return {
      steps: records
        .filter((record) => typeof record.count === 'number')
        .map((record) => ({
          startTime: String(record.startTime),
          endTime: String(record.endTime),
          count: Number(record.count),
        })),
    };
  }
  if (kind === 'SleepSession') {
    return {
      sleep: records.map((record) => ({ startTime: String(record.startTime), endTime: String(record.endTime) })),
    };
  }
  const key = kind === 'SkinTemperature' ? 'skinTemperature' : 'bodyTemperature';
  return {
    [key]: records
      .map((record) => ({ time: String(record.time ?? record.startTime), celsius: celsius(record) }))
      .filter((record): record is { time: string; celsius: number } => record.celsius !== null),
  };
}

export class HealthConnectSource implements HealthDataSource {
  readonly name = 'Health Connect';

  constructor(
    private readonly load: () => Promise<HealthModule> = loadModule,
    private readonly os: string = Platform.OS,
  ) {}

  async availability(): Promise<HealthStatus> {
    if (this.os !== 'android') {
      return { state: 'unavailable', message: 'Health Connect solo está disponible en Android.' };
    }
    try {
      const health = await this.load();
      const status = await health.getSdkStatus();
      if (status === health.SdkAvailabilityStatus.SDK_AVAILABLE) {
        return { state: 'available', message: 'Health Connect está listo para leer los datos que autorices.' };
      }
      if (status === health.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        return { state: 'missing', message: 'Instala o actualiza Health Connect para continuar.' };
      }
      return { state: 'unavailable', message: 'Health Connect no está disponible en este dispositivo.' };
    } catch {
      return {
        state: 'error',
        message: 'No se pudo consultar Health Connect. La app sigue disponible para una lectura manual.',
      };
    }
  }

  async requestAccess(options: { includeBackground?: boolean } = {}): Promise<{ granted: boolean; message: string }> {
    const status = await this.availability();
    if (status.state === 'missing') {
      await Linking.openURL(PLAY_STORE).catch(() => undefined);
      return { granted: false, message: status.message };
    }
    if (status.state !== 'available') {
      return { granted: false, message: status.message };
    }
    try {
      const health = await this.load();
      const initialized = await health.initialize();
      if (!initialized) {
        return { granted: false, message: 'Health Connect no terminó de iniciarse.' };
      }
      const granted = await health.requestPermission(READS.map((recordType) => ({ accessType: 'read' as const, recordType })));
      if (!Array.isArray(granted) || granted.length === 0) {
        return { granted: false, message: 'No concediste permisos de lectura en Health Connect.' };
      }
      if (options.includeBackground) {
        // Lectura en segundo plano (react-native-health-connect 4.1.3 la expone como BackgroundAccessPermission).
        // Quien llama lo pide una sola vez por cuenta; si el sistema no la ofrece, la lectura sigue en primer plano.
        await health
          .requestPermission([{ accessType: 'read' as const, recordType: 'BackgroundAccessPermission' }])
          .catch(() => undefined);
      }
      return { granted: true, message: 'Permisos de lectura concedidos.' };
    } catch {
      return { granted: false, message: 'Health Connect rechazó la solicitud de permisos.' };
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
    try {
      const health = await this.load();
      const timeRangeFilter: TimeRange = { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() };
      let failures = 0;
      let requiredFailures = 0;
      const bundles = await Promise.all(
        READS.map(async (recordType) => {
          try {
            return toBundle(recordType, await readAllPages(health, recordType, timeRangeFilter));
          } catch {
            failures += 1;
            if (!OPTIONAL_READS.has(recordType)) {
              requiredFailures += 1;
            }
            return {};
          }
        }),
      );
      const samples = bundles.flatMap((bundle) => mapHealthConnectRecords(bundle));
      if (failures === READS.length) {
        return { samples: [], message: 'No se pudieron leer los registros de Health Connect.', failed: true };
      }
      // Un tipo que falla (permiso faltante, página incompleta) deja la ventana sin avanzar: nada se pierde en silencio.
      const failed = requiredFailures > 0;
      return {
        samples,
        message: samples.length === 0 && !failed ? 'Health Connect no tiene lecturas en este periodo.' : null,
        ...(failed ? { failed: true } : {}),
      };
    } catch {
      return { samples: [], message: 'No se pudieron leer los registros de Health Connect.', failed: true };
    }
  }
}

export const appleHealthMessage =
  'Apple Health se lee en iPhone con un development build, solo lectura. No funciona en Expo Go ni en Android.';
