import { openJson, sealJson } from './seal';

describe('sealJson', () => {
  it('round-trips a snapshot with AES-256-GCM', () => {
    const key = new Uint8Array(32).fill(9);
    const nonce = new Uint8Array(12).fill(4);
    const sealed = sealJson('{"samples":[1]}', key, nonce);
    expect(sealed).not.toContain('samples');
    expect(openJson(sealed, key)).toBe('{"samples":[1]}');
  });
});
