import type { BiometricSample } from './domain/types';

export type HealthAvailability = 'available' | 'missing' | 'unavailable' | 'error';

export type HealthStatus = {
  state: HealthAvailability;
  message: string;
};

export type HealthReadResult = {
  samples: BiometricSample[];
  message: string | null;
  /** true cuando la lectura falló (no es lo mismo que «sin datos»): quien lee no avanza su marca de lectura. */
  failed?: boolean;
};

export interface HealthDataSource {
  readonly name: string;
  availability(): Promise<HealthStatus>;
  requestAccess(): Promise<{ granted: boolean; message: string }>;
  readRange(from: Date, to: Date): Promise<HealthReadResult>;
  /** Lee sin pedir permisos (apta para segundo plano, donde no se puede mostrar un diálogo). */
  readGranted?(from: Date, to: Date): Promise<HealthReadResult>;
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

  readRange(): Promise<HealthReadResult> {
    return Promise.resolve({ samples: [], message: this.message });
  }
}
