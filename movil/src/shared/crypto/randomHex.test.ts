import * as Crypto from 'expo-crypto';
import { randomHex } from './randomHex';

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(),
}));

const getRandomBytes = Crypto.getRandomBytes as jest.Mock;

describe('randomHex', () => {
  beforeEach(() => {
    getRandomBytes.mockReset();
  });

  it('builds 32 hex characters from 16 bytes of the secure generator', () => {
    getRandomBytes.mockReturnValue(Uint8Array.from([0, 1, 15, 16, 255, 171, 205, 239, 1, 2, 3, 4, 5, 6, 7, 8]));

    const value = randomHex();

    expect(getRandomBytes).toHaveBeenCalledWith(16);
    expect(value).toBe('00010f10ffabcdef0102030405060708');
    expect(value).toMatch(/^[0-9a-f]{32}$/);
  });

  it('does not repeat across calls when the generator returns new bytes', () => {
    getRandomBytes
      .mockReturnValueOnce(new Uint8Array(16).fill(1))
      .mockReturnValueOnce(new Uint8Array(16).fill(2));

    expect(randomHex()).not.toBe(randomHex());
  });
});
