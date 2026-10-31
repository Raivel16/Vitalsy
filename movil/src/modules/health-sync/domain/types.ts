export const BIOMETRIC_KINDS = [
  'heart_rate',
  'resting_heart_rate',
  'hrv',
  'spo2',
  'sleep',
  'steps',
  'skin_temperature',
  'body_temperature',
] as const;

export type BiometricKind = (typeof BIOMETRIC_KINDS)[number];

/** `vitalsy_band`: banda propia por Bluetooth LE (RF-113). */
export type SampleOrigin = 'health_connect' | 'health_kit' | 'manual' | 'vitalsy_band';

export type BiometricSample = {
  id: string;
  kind: BiometricKind;
  value: number;
  unit: string;
  startedAt: string;
  endedAt: string;
  origin: SampleOrigin;
};

export const DEVIATION_KINDS: BiometricKind[] = [
  'heart_rate',
  'resting_heart_rate',
  'spo2',
  'hrv',
  'skin_temperature',
  'body_temperature',
];

export const PRIMARY_KINDS: BiometricKind[] = ['heart_rate', 'spo2', 'sleep', 'steps'];
