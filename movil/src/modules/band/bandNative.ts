import { PermissionsAndroid, Platform } from 'react-native';
import { BandClient, type BleApi } from './bandClient';

// Falla al compilar si la API real de react-native-ble-manager deja de encajar con BleApi.
type BleManagerFits = typeof import('react-native-ble-manager').default extends BleApi ? true : never;
export const BLE_MANAGER_FITS: BleManagerFits = true;

/** Sin el módulo nativo (Expo Go, web, pruebas) devuelve null: la banda queda «no disponible». */
function loadBleManager(): BleApi | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-ble-manager') as { default?: BleApi };
    return module.default && typeof module.default.start === 'function' ? module.default : null;
  } catch {
    return null;
  }
}

let client: BandClient | null | undefined;

/** Un solo cliente por proceso: la conexión BLE es única. */
export function getBandClient(): BandClient | null {
  if (client === undefined) {
    const api = loadBleManager();
    client = api ? new BandClient(api, Platform.OS, () => new Date()) : null;
  }
  return client;
}

function blePermissions(): string[] {
  if (Platform.OS !== 'android') {
    return [];
  }
  if (Number(Platform.Version) >= 31) {
    return [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT];
  }
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

/** Pide los permisos de Bluetooth (Android). En iOS los pide el sistema al usar Bluetooth. */
export async function requestBlePermissions(): Promise<boolean> {
  const permissions = blePermissions();
  if (permissions.length === 0) {
    return true;
  }
  const result = await PermissionsAndroid.requestMultiple(permissions as never);
  return permissions.every((permission) => (result as Record<string, string>)[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

/** Sin diálogos (segundo plano): solo comprueba lo ya concedido. */
export async function hasBlePermissions(): Promise<boolean> {
  const permissions = blePermissions();
  for (const permission of permissions) {
    if (!(await PermissionsAndroid.check(permission as never))) {
      return false;
    }
  }
  return true;
}
