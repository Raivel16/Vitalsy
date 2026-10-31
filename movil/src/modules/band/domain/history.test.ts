import {
  ackHistoryCommand,
  bandDeviceTag,
  BAND_COMMAND,
  latestMinute,
  parseHistoryChunk,
  recordsToSamples,
  requestHistoryCommand,
  setTimeCommand,
} from './history';

describe('band commands', () => {
  it('encodes the current time as UTC epoch seconds, little-endian', () => {
    expect(setTimeCommand(new Date('2026-10-30T12:00:00Z'))).toEqual([0x03, 0xc0, 0x86, 0xe4, 0x6a]);
  });

  it('encodes history request and acknowledgement with an epoch minute', () => {
    expect(requestHistoryCommand(29_889_360)).toEqual([0x04, 0x50, 0x13, 0xc8, 0x01]);
    expect(ackHistoryCommand(29_889_360)).toEqual([0x05, 0x50, 0x13, 0xc8, 0x01]);
  });

  it('keeps the one-byte commands of the serial monitor', () => {
    expect(BAND_COMMAND.swapChannels).toBe(0x01);
    expect(BAND_COMMAND.ledTest).toBe(0x02);
  });
});

describe('parseHistoryChunk', () => {
  it('reads up to two minute records', () => {
    const chunk = [0x02, 0x50, 0x13, 0xc8, 0x01, 72, 98, 0x2a, 0x00, 0x51, 0x13, 0xc8, 0x01, 0, 97, 0xff, 0xff];
    expect(parseHistoryChunk(chunk)).toEqual({
      end: false,
      records: [
        { minute: 29_889_360, heartRate: 72, spo2: 98, rmssd: 42 },
        { minute: 29_889_361, heartRate: null, spo2: 97, rmssd: null },
      ],
    });
  });

  it('treats an empty chunk as the end of the download', () => {
    expect(parseHistoryChunk([0x00])).toEqual({ end: true, records: [] });
  });

  it('rejects chunks whose length does not match the count', () => {
    expect(parseHistoryChunk([0x02, 0x50, 0x13, 0xc8, 0x01, 72, 98, 0x2a, 0x00])).toBeNull();
    expect(parseHistoryChunk([])).toBeNull();
  });
});

describe('bandDeviceTag', () => {
  it('uses the last 8 hexadecimal characters of the Android MAC or iOS identifier', () => {
    expect(bandDeviceTag('24:58:7C:AB:12:EF')).toBe('7CAB12EF');
    expect(bandDeviceTag('5b1c0f3e-2d7a-4c11-9a8e-77e1d0c4a9b2')).toBe('D0C4A9B2');
  });
});

describe('recordsToSamples', () => {
  const minute = 29_889_360; // 2026-10-30T12:00:00Z

  it('turns a record into one sample per measured kind, with deterministic ids', () => {
    const samples = recordsToSamples([{ minute, heartRate: 72, spo2: 98, rmssd: 42 }], '24:58:7C:AB:12:EF');
    expect(samples).toEqual([
      {
        id: `vb:7CAB12EF:heart_rate:${minute}`,
        kind: 'heart_rate',
        value: 72,
        unit: 'lpm',
        startedAt: '2026-10-30T12:00:00.000Z',
        endedAt: '2026-10-30T12:01:00.000Z',
        origin: 'vitalsy_band',
      },
      expect.objectContaining({ id: `vb:7CAB12EF:spo2:${minute}`, kind: 'spo2', value: 98, unit: '%' }),
      expect.objectContaining({ id: `vb:7CAB12EF:hrv:${minute}`, kind: 'hrv', value: 42, unit: 'ms' }),
    ]);
  });

  it('drops missing and implausible values instead of sending them', () => {
    const samples = recordsToSamples([{ minute, heartRate: 250, spo2: null, rmssd: 900 }], 'AABBCCDD');
    expect(samples).toEqual([]);
  });

  it('keeps ids under the 64 characters accepted by the server', () => {
    const [sample] = recordsToSamples([{ minute, heartRate: 70, spo2: null, rmssd: null }], 'x'.repeat(80) + 'ABCDEF12');
    expect(sample.id.length).toBeLessThanOrEqual(64);
  });
});

describe('latestMinute', () => {
  it('returns the newest minute or null', () => {
    expect(latestMinute([{ minute: 5, heartRate: 1, spo2: null, rmssd: null }, { minute: 9, heartRate: 1, spo2: null, rmssd: null }])).toBe(9);
    expect(latestMinute([])).toBeNull();
  });
});
