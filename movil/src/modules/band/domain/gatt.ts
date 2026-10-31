/**
 * Lectores puros de los formatos GATT de la banda Vitalsy (RF-113).
 * Contrato: docs/architecture/protocolo-banda-ble.md. Todo es little-endian.
 */

const VITALSY_BASE = '-a30d-4655-b91b-f915f0447e63';

/** UUIDs en la forma que devuelve `shortUuid`. */
export const BAND_UUID = {
  heartRateService: '180d',
  heartRateMeasurement: '2a37',
  plxService: '1822',
  plxContinuous: '2a5f',
  batteryService: '180f',
  batteryLevel: '2a19',
  vitalsyService: `64af0001${VITALSY_BASE}`,
  state: `64af0002${VITALSY_BASE}`,
  control: `64af0003${VITALSY_BASE}`,
  history: `64af0004${VITALSY_BASE}`,
} as const;

/** Prefijo del nombre anunciado: `Vitalsy-XXXX`. */
export const BAND_NAME_PREFIX = 'Vitalsy-';

const SIG_BASE = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/;

/** Android entrega UUIDs de 128 bits y iOS los de 16 bits: se comparan siempre en esta forma. */
export function shortUuid(uuid: string): string {
  const lower = uuid.toLowerCase();
  return SIG_BASE.exec(lower)?.[1] ?? lower;
}

function u16(bytes: number[], at: number): number {
  return bytes[at] | (bytes[at + 1] << 8);
}

/** SFLOAT de IEEE 11073: exponente de 4 bits y mantisa de 12, ambos con signo. NaN y reservados → null. */
export function decodeSfloat(raw: number): number | null {
  let mantissa = raw & 0x0fff;
  if (mantissa >= 0x07fe && mantissa <= 0x0802) {
    return null;
  }
  let exponent = (raw >> 12) & 0x0f;
  if (mantissa >= 0x0800) {
    mantissa -= 0x1000;
  }
  if (exponent >= 0x08) {
    exponent -= 0x10;
  }
  return Number((mantissa * 10 ** exponent).toFixed(Math.max(0, -exponent)));
}

export type HeartRateReading = {
  bpm: number;
  /** null: el sensor no informa contacto. */
  contact: boolean | null;
  rrMs: number[];
};

/** Heart Rate Measurement (0x2A37). */
export function parseHeartRate(bytes: number[]): HeartRateReading | null {
  if (bytes.length < 2) {
    return null;
  }
  const flags = bytes[0];
  const wide = (flags & 0x01) !== 0;
  let at = 1;
  if (bytes.length < at + (wide ? 2 : 1)) {
    return null;
  }
  const bpm = wide ? u16(bytes, at) : bytes[at];
  at += wide ? 2 : 1;
  const contact = (flags & 0x04) !== 0 ? (flags & 0x02) !== 0 : null;
  if ((flags & 0x08) !== 0) {
    at += 2; // energía gastada: no se usa
  }
  const rrMs: number[] = [];
  if ((flags & 0x10) !== 0) {
    for (; at + 1 < bytes.length; at += 2) {
      rrMs.push(Math.round((u16(bytes, at) * 1000) / 1024));
    }
  }
  return { bpm, contact, rrMs };
}

export type PlxReading = {
  spo2: number | null;
  pulse: number | null;
  /** Índice de perfusión (%). */
  pi: number | null;
  /** false si la banda marcó la medida como dudosa o estimada. */
  reliable: boolean;
};

const PLX_QUESTIONABLE = 1 << 14;
const PLX_EARLY_ESTIMATE = 1 << 6;
const PLX_INVALID = 1 << 15;

/** PLX Continuous Measurement (0x2A5F). */
export function parsePlx(bytes: number[]): PlxReading | null {
  if (bytes.length < 5) {
    return null;
  }
  const flags = bytes[0];
  let at = 5;
  const skip = (present: boolean, size: number) => {
    if (present) {
      at += size;
    }
  };
  skip((flags & 0x01) !== 0, 4); // SpO2PR-Fast
  skip((flags & 0x02) !== 0, 4); // SpO2PR-Slow
  let measurement = 0;
  if ((flags & 0x04) !== 0) {
    if (bytes.length < at + 2) {
      return null;
    }
    measurement = u16(bytes, at);
    at += 2;
  }
  skip((flags & 0x08) !== 0, 3); // estado del sensor: la calidad ya está en el estado de medida
  let pi: number | null = null;
  if ((flags & 0x10) !== 0) {
    if (bytes.length < at + 2) {
      return null;
    }
    pi = decodeSfloat(u16(bytes, at));
  }
  return {
    spo2: decodeSfloat(u16(bytes, 1)),
    pulse: decodeSfloat(u16(bytes, 3)),
    pi,
    reliable: (measurement & (PLX_QUESTIONABLE | PLX_EARLY_ESTIMATE | PLX_INVALID)) === 0,
  };
}

export type BandPhase = 'no_finger' | 'adjusting' | 'measuring';
export type BandQuality = 'stabilizing' | 'motion' | 'weak_signal' | 'unstable_rhythm' | 'searching' | 'good';

export type BandState = {
  phase: BandPhase;
  /** Solo mientras mide. */
  quality: BandQuality | null;
  channelsSwapped: boolean;
  /** «R muy alto»: rojo e IR quizá intercambiados. */
  channelWarning: boolean;
  pi: number;
  r: number | null;
};

const PHASES: BandPhase[] = ['no_finger', 'adjusting', 'measuring'];
const QUALITIES: BandQuality[] = ['stabilizing', 'motion', 'weak_signal', 'unstable_rhythm', 'searching', 'good'];
const STATE_VERSION = 1;

/** Estado de la medida (64af0002), versión 1. */
export function parseBandState(bytes: number[]): BandState | null {
  if (bytes.length < 8 || bytes[0] !== STATE_VERSION) {
    return null;
  }
  const phase = PHASES[bytes[1]];
  if (!phase) {
    return null;
  }
  const r = u16(bytes, 6);
  return {
    phase,
    quality: phase === 'measuring' ? (QUALITIES[bytes[2]] ?? null) : null,
    channelsSwapped: (bytes[3] & 0x01) !== 0,
    channelWarning: (bytes[3] & 0x02) !== 0,
    pi: u16(bytes, 4) / 100,
    r: r === 0 ? null : r / 100,
  };
}
