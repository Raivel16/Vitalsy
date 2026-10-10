import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return globalThis.btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }
  return bytes;
}

export function sealJson(plain: string, key: Uint8Array, nonce: Uint8Array): string {
  const encrypted = gcm(key, nonce).encrypt(utf8ToBytes(plain));
  const packed = new Uint8Array(nonce.length + encrypted.length);
  packed.set(nonce, 0);
  packed.set(encrypted, nonce.length);
  return bytesToBase64(packed);
}

export function openJson(payload: string, key: Uint8Array): string {
  const packed = base64ToBytes(payload);
  const nonce = packed.slice(0, 12);
  const encrypted = packed.slice(12);
  return bytesToUtf8(gcm(key, nonce).decrypt(encrypted));
}
