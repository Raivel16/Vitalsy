import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { base64ToBytes, bytesToBase64 } from '../crypto/seal';
import { SqlitePersistence } from './sqlitePersistence';

async function encryptionKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync('vitalsy.life.key');
  if (existing) {
    return base64ToBytes(existing);
  }
  const bytes = await Crypto.getRandomBytesAsync(32);
  await SecureStore.setItemAsync('vitalsy.life.key', bytesToBase64(bytes));
  return bytes;
}

/** Abre la base cifrada del teléfono. La usan la app y la tarea en segundo plano. */
export async function openLifePersistence(): Promise<SqlitePersistence> {
  const key = await encryptionKey();
  const database = await SQLite.openDatabaseAsync('vitalsy-life.db');
  return SqlitePersistence.open(database, key, () => Crypto.getRandomBytes(12));
}
