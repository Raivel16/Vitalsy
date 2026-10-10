import * as Crypto from 'expo-crypto';

/** 128 bits del generador criptográfico del sistema, en hexadecimal (32 caracteres). */
export function randomHex(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
