import type { BiometricKind, BiometricSample } from '../../health-sync/domain/types';

/**
 * Comandos (64af0003) e historial por minuto (64af0004) de la banda Vitalsy.
 * Contrato: docs/architecture/protocolo-banda-ble.md.
 */
export const BAND_COMMAND = {
  swapChannels: 0x01,
  ledTest: 0x02,
  setTime: 0x03,
  requestHistory: 0x04,
  ackHistory: 0x05,
} as const;

function withU32(command: number, value: number): number[] {
  const v = Math.max(0, Math.floor(value)) >>> 0;
  return [command, v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

/** La banda no tiene reloj propio: la app le da la hora UTC al conectar. */
export function setTimeCommand(now: Date): number[] {
  return withU32(BAND_COMMAND.setTime, now.getTime() / 1000);
}

/** Pide los registros desde ese minuto (época Unix / 60). */
export function requestHistoryCommand(fromMinute: number): number[] {
  return withU32(BAND_COMMAND.requestHistory, fromMinute);
}

/** Confirma lo guardado: la banda borra los registros hasta ese minuto, incluido. */
export function ackHistoryCommand(upToMinute: number): number[] {
  return withU32(BAND_COMMAND.ackHistory, upToMinute);
}

export type MinuteRecord = {
  /** Minuto de época Unix (segundos / 60), en UTC. */
  minute: number;
  heartRate: number | null;
  spo2: number | null;
  /** HRV RMSSD en ms. */
  rmssd: number | null;
};

const RECORD_SIZE = 8;

/** Un fragmento es `[n] + n registros de 8 bytes`; n = 0 marca el fin de la descarga. */
export function parseHistoryChunk(bytes: number[]): { records: MinuteRecord[]; end: boolean } | null {
  if (bytes.length < 1) {
    return null;
  }
  const count = bytes[0];
  if (bytes.length !== 1 + count * RECORD_SIZE) {
    return null;
  }
  const records: MinuteRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const at = 1 + i * RECORD_SIZE;
    const minute = (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
    const rmssd = bytes[at + 6] | (bytes[at + 7] << 8);
    records.push({
      minute,
      heartRate: bytes[at + 4] === 0 ? null : bytes[at + 4],
      spo2: bytes[at + 5] === 0 ? null : bytes[at + 5],
      rmssd: rmssd === 0xffff ? null : rmssd,
    });
  }
  return { records, end: count === 0 };
}

/** Parte estable y corta del id del dispositivo (MAC en Android, UUID en iOS) para los ids de muestra. */
export function bandDeviceTag(deviceId: string): string {
  return deviceId.replace(/[^0-9a-f]/gi, '').slice(-8).toUpperCase();
}

/** Mismos rangos de plausibilidad que el servidor (LifeSync::RANGES): lo que no pasaría se descarta aquí. */
const KINDS: Array<{ kind: BiometricKind; unit: string; pick: (r: MinuteRecord) => number | null; min: number; max: number }> = [
  { kind: 'heart_rate', unit: 'lpm', pick: (r) => r.heartRate, min: 30, max: 220 },
  { kind: 'spo2', unit: '%', pick: (r) => r.spo2, min: 50, max: 100 },
  { kind: 'hrv', unit: 'ms', pick: (r) => r.rmssd, min: 0, max: 500 },
];

export function recordsToSamples(records: MinuteRecord[], deviceId: string): BiometricSample[] {
  const tag = bandDeviceTag(deviceId);
  const samples: BiometricSample[] = [];
  for (const record of records) {
    const start = new Date(record.minute * 60_000);
    const end = new Date((record.minute + 1) * 60_000);
    for (const { kind, unit, pick, min, max } of KINDS) {
      const value = pick(record);
      if (value === null || value < min || value > max) {
        continue;
      }
      samples.push({
        id: `vb:${tag}:${kind}:${record.minute}`,
        kind,
        value,
        unit,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        origin: 'vitalsy_band',
      });
    }
  }
  return samples;
}

export function latestMinute(records: MinuteRecord[]): number | null {
  return records.length === 0 ? null : Math.max(...records.map((record) => record.minute));
}
