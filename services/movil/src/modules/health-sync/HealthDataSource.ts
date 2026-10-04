import type { BiometricSample } from './domain/types';

export type HealthAvailability = 'available' | 'missing' | 'unavailable' | 'error';

export type HealthStatus = {
  state: HealthAvailability;
  message: string;
};

export interface HealthDataSource {
  readonly name: string;
  availability(): Promise<HealthStatus>;
  requestAccess(): Promise<{ granted: boolean; message: string }>;
  readRange(from: Date, to: Date): Promise<{ samples: BiometricSample[]; message: string | null }>;
  readGranted?(from: Date, to: Date): Promise<{ samples: BiometricSample[]; message: string | null }>;
}

export class UnavailableHealthSource implements HealthDataSource {
  constructor(
    readonly name: string,
    private readonly message: string,
  ) {}

  availability(): Promise<HealthStatus> {
    return Promise.resolve({ state: 'unavailable', message: this.message });
  }

  requestAccess(): Promise<{ granted: boolean; message: string }> {
    return Promise.resolve({ granted: false, message: this.message });
  }

  readRange(): Promise<{ samples: BiometricSample[]; message: string | null }> {
    return Promise.resolve({ samples: [], message: this.message });
  }
}
