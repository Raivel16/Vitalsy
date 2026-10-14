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

type HealthModule = {
  getSdkStatus: () => Promise<number>;
  initialize: () => Promise<boolean>;
  requestPermission: (permissions: Array<{ accessType: 'read'; recordType: string }>) => Promise<unknown[]>;
  readRecords: (
    recordType: string,
    options: { timeRangeFilter: { operator: 'between'; startTime: string; endTime: string } },
  ) => Promise<{ records: Array<Record<string, unknown>> }>;
  SdkAvailabilityStatus: { SDK_AVAILABLE: number; SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: number };
};

async function loadModule(): Promise<HealthModule> {
  const imported = (await import('react-native-health-connect')) as unknown as HealthModule;
  return imported;
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

  async availability(): Promise<HealthStatus> {
    if (Platform.OS !== 'android') {
      return { state: 'unavailable', message: 'Health Connect solo está disponible en Android.' };
    }
    try {
      const health = await loadModule();
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

  async requestAccess(): Promise<{ granted: boolean; message: string }> {
    const status = await this.availability();
    if (status.state === 'missing') {
      await Linking.openURL(PLAY_STORE).catch(() => undefined);
      return { granted: false, message: status.message };
    }
    if (status.state !== 'available') {
      return { granted: false, message: status.message };
    }
    try {
      const health = await loadModule();
      const initialized = await health.initialize();
      if (!initialized) {
        return { granted: false, message: 'Health Connect no terminó de iniciarse.' };
      }
      const granted = await health.requestPermission(READS.map((recordType) => ({ accessType: 'read' as const, recordType })));
      if (!Array.isArray(granted) || granted.length === 0) {
        return { granted: false, message: 'No concediste permisos de lectura en Health Connect.' };
      }
      // Lectura en segundo plano (Android 14+ / Health Connect con la función). Si no existe, la lectura sigue en primer plano.
      await health
        .requestPermission([{ accessType: 'read' as const, recordType: 'BackgroundAccessPermission' }])
        .catch(() => undefined);
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
      const health = await loadModule();
      const timeRangeFilter = { operator: 'between' as const, startTime: from.toISOString(), endTime: to.toISOString() };
      const bundles = await Promise.all(
        READS.map(async (recordType) => {
          try {
            const result = await health.readRecords(recordType, { timeRangeFilter });
            return toBundle(recordType, result.records ?? []);
          } catch {
            return {};
          }
        }),
      );
      const samples = bundles.flatMap((bundle) => mapHealthConnectRecords(bundle));
      return {
        samples,
        message: samples.length === 0 ? 'Health Connect no tiene lecturas en este periodo.' : null,
      };
    } catch {
      return { samples: [], message: 'No se pudieron leer los registros de Health Connect.', failed: true };
    }
  }
}

export const appleHealthMessage =
  'Apple Health se lee en iPhone con un development build, solo lectura. No funciona en Expo Go ni en Android.';
