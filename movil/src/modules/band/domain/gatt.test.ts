import { decodeSfloat, parseBandState, parseHeartRate, parsePlx, shortUuid } from './gatt';

// Bytes de ejemplo de docs/architecture/protocolo-banda-ble.md
describe('shortUuid', () => {
  it('reduces a Bluetooth SIG base UUID to its 16-bit form', () => {
    expect(shortUuid('00002A37-0000-1000-8000-00805F9B34FB')).toBe('2a37');
    expect(shortUuid('2A37')).toBe('2a37');
  });

  it('keeps vendor 128-bit UUIDs, in lower case', () => {
    expect(shortUuid('64AF0002-A30D-4655-B91B-F915F0447E63')).toBe('64af0002-a30d-4655-b91b-f915f0447e63');
  });
});

describe('decodeSfloat', () => {
  it('decodes mantissa and signed exponent', () => {
    expect(decodeSfloat(0x0062)).toBe(98);
    expect(decodeSfloat(0xe0eb)).toBeCloseTo(2.35);
  });

  it('treats NaN and reserved values as missing', () => {
    expect(decodeSfloat(0x07ff)).toBeNull();
    expect(decodeSfloat(0x0800)).toBeNull();
    expect(decodeSfloat(0x07fe)).toBeNull();
  });

  it('decodes a negative mantissa', () => {
    expect(decodeSfloat(0x0fff)).toBe(-1);
  });
});

describe('parseHeartRate', () => {
  it('reads pulse, contact and RR intervals in milliseconds', () => {
    expect(parseHeartRate([0x16, 0x48, 0x55, 0x03])).toEqual({ bpm: 72, contact: true, rrMs: [833] });
  });

  it('reads a 16-bit pulse and reports unknown contact when not supported', () => {
    expect(parseHeartRate([0x01, 0x2c, 0x01])).toEqual({ bpm: 300, contact: null, rrMs: [] });
  });

  it('skips the energy expended field before RR intervals', () => {
    expect(parseHeartRate([0x18, 0x40, 0x10, 0x00, 0x00, 0x04])).toEqual({ bpm: 64, contact: null, rrMs: [1000] });
  });

  it('rejects truncated payloads', () => {
    expect(parseHeartRate([])).toBeNull();
    expect(parseHeartRate([0x01, 0x48])).toBeNull();
  });
});

describe('parsePlx', () => {
  it('reads SpO2, pulse and perfusion index of a reliable reading', () => {
    expect(parsePlx([0x1c, 0x62, 0x00, 0x48, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0xeb, 0xe0])).toEqual({
      spo2: 98,
      pulse: 72,
      pi: expect.closeTo(2.35, 5),
      reliable: true,
    });
  });

  it('marks questionable or early estimated readings as unreliable', () => {
    const questionable = parsePlx([0x1c, 0x62, 0x00, 0x48, 0x00, 0x20, 0x40, 0x40, 0x00, 0x00, 0xeb, 0xe0]);
    const estimated = parsePlx([0x1c, 0x62, 0x00, 0x48, 0x00, 0x60, 0x00, 0x00, 0x02, 0x00, 0xeb, 0xe0]);
    expect(questionable?.reliable).toBe(false);
    expect(estimated?.reliable).toBe(false);
  });

  it('reads a payload without optional fields and missing SpO2', () => {
    expect(parsePlx([0x00, 0xff, 0x07, 0x48, 0x00])).toEqual({ spo2: null, pulse: 72, pi: null, reliable: true });
  });

  it('rejects truncated payloads', () => {
    expect(parsePlx([0x1c, 0x62, 0x00])).toBeNull();
  });
});

describe('parseBandState', () => {
  it('reads phase, quality, flags, PI and R', () => {
    expect(parseBandState([0x01, 0x02, 0x05, 0x00, 0xeb, 0x00, 0x37, 0x00])).toEqual({
      phase: 'measuring',
      quality: 'good',
      channelsSwapped: false,
      channelWarning: false,
      pi: 2.35,
      r: 0.55,
    });
  });

  it('has no quality while there is no finger', () => {
    expect(parseBandState([0x01, 0x00, 0xff, 0x03, 0x00, 0x00, 0x00, 0x00])).toEqual({
      phase: 'no_finger',
      quality: null,
      channelsSwapped: true,
      channelWarning: true,
      pi: 0,
      r: null,
    });
  });

  it('rejects unknown versions and short payloads', () => {
    expect(parseBandState([0x02, 0x02, 0x05, 0x00, 0, 0, 0, 0])).toBeNull();
    expect(parseBandState([0x01, 0x02])).toBeNull();
  });
});
