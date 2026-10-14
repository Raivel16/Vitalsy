import { Platform } from 'react-native';
import { HealthConnectSource } from './HealthConnectSource';
import { UnavailableHealthSource, type HealthDataSource } from './HealthDataSource';
import { HealthKitSource, loadHealthKit, type HealthKitLoader } from './HealthKitSource';

type Options = {
  os?: string;
  loadHealthKit?: HealthKitLoader;
};

/**
 * Health Connect en Android, HealthKit en iOS y una fuente «no disponible» en el resto.
 * Nunca lanza: sin el módulo nativo (Expo Go, web, pruebas) devuelve una fuente honesta que no lee nada.
 */
export function createHealthSource(options: Options = {}): HealthDataSource {
  const os = options.os ?? Platform.OS;
  if (os === 'android') {
    return new HealthConnectSource();
  }
  if (os === 'ios') {
    const loader = options.loadHealthKit ?? loadHealthKit;
    try {
      const native = loader();
      if (native) {
        return new HealthKitSource(() => native, 'ios');
      }
    } catch {
      // Cae a la fuente no disponible.
    }
    return new UnavailableHealthSource('Apple Health', 'Requiere un development build en un iPhone.');
  }
  return new UnavailableHealthSource('Salud', 'Health Connect (Android) y Apple Health (iPhone) no están disponibles en esta plataforma.');
}
