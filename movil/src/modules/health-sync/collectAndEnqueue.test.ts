import { emptySnapshot, LifeApp } from '../life/lifeApp';
import { collectAndEnqueue, FIRST_READ_WINDOW_MS, OVERLAP_MS, readWindow } from './collectAndEnqueue';
import type { BiometricSample } from './domain/types';
import type { HealthDataSource, HealthStatus } from './HealthDataSource';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function sample(id: string): BiometricSample {
  return { id, kind: 'heart_rate', value: 60, unit: 'lpm', startedAt: NOW.toISOString(), endedAt: NOW.toISOString(), origin: 'health_kit' };
}

function makeLife(): LifeApp {
  return new LifeApp(emptySnapshot(), { now: () => NOW, random: () => 'r', digest: async () => 'd' as never });
}

function fakeSource(options: {
  status?: HealthStatus;
  granted?: boolean;
  samples?: BiometricSample[];
  failed?: boolean;
  readGranted?: boolean;
}): HealthDataSource & { reads: Array<[Date, Date]>; requested: number } {
  const reads: Array<[Date, Date]> = [];
  const source = {
    name: 'fake',
    reads,
    requested: 0,
    availability: async () => options.status ?? { state: 'available' as const, message: 'ok' },
    requestAccess: async () => {
      source.requested += 1;
      return { granted: options.granted ?? true, message: options.granted === false ? 'No concediste permisos.' : 'Permisos de lectura concedidos.' };
    },
    readRange: async (from: Date, to: Date) => {
      reads.push([from, to]);
      return { samples: options.samples ?? [], message: null, failed: options.failed };
    },
    readGranted: options.readGranted === false ? undefined : async (from: Date, to: Date) => {
      reads.push([from, to]);
      return { samples: options.samples ?? [], message: null, failed: options.failed };
    },
  };
  return source as never;
}

describe('readWindow', () => {
  it('caps the first read to 14 days', () => {
    const { from, to } = readWindow(null, NOW);
    expect(to).toEqual(NOW);
    expect(NOW.getTime() - from.getTime()).toBe(FIRST_READ_WINDOW_MS);
    expect(FIRST_READ_WINDOW_MS).toBe(14 * DAY);
  });

  it('reads only the delta since the last read, with a small overlap for late wearable syncs', () => {
    const last = new Date(NOW.getTime() - 60 * 60 * 1000);
    const { from } = readWindow(last.toISOString(), NOW);
    expect(from.getTime()).toBe(last.getTime() - OVERLAP_MS);
  });

  it('never reads further back than 14 days even if the last read is older or invalid', () => {
    const old = new Date(NOW.getTime() - 60 * DAY).toISOString();
    expect(NOW.getTime() - readWindow(old, NOW).from.getTime()).toBe(FIRST_READ_WINDOW_MS);
    expect(NOW.getTime() - readWindow('not-a-date', NOW).from.getTime()).toBe(FIRST_READ_WINDOW_MS);
  });

  it('ignores a last read in the future', () => {
    const future = new Date(NOW.getTime() + DAY).toISOString();
    expect(NOW.getTime() - readWindow(future, NOW).from.getTime()).toBe(FIRST_READ_WINDOW_MS);
  });
});

describe('collectAndEnqueue', () => {
  it('interactive: asks for access, reads, enqueues and stores the last read', async () => {
    const life = makeLife();
    const source = fakeSource({ samples: [sample('a'), sample('b')] });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: true });

    expect(result).toMatchObject({ status: 'read', added: 2 });
    expect(source.requested).toBe(1);
    expect(life.state.samples.map((item) => item.id)).toEqual(['a', 'b']);
    expect(life.state.queue).toHaveLength(1);
    expect(life.state.healthSync).toEqual({ accessGranted: true, lastReadAt: NOW.toISOString() });
  });

  it('interactive: denied access is recorded and nothing is read', async () => {
    const life = makeLife();
    const source = fakeSource({ granted: false });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: true });

    expect(result).toMatchObject({ status: 'denied', message: 'No concediste permisos.' });
    expect(source.reads).toHaveLength(0);
    expect(life.state.healthSync.accessGranted).toBe(false);
  });

  it('background: never prompts and is a no-op when access was never granted', async () => {
    const life = makeLife();
    const source = fakeSource({ samples: [sample('a')] });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: false });

    expect(result.status).toBe('no_permission');
    expect(source.requested).toBe(0);
    expect(source.reads).toHaveLength(0);
    expect(life.state.queue).toHaveLength(0);
  });

  it('background: reads only the delta once access was granted', async () => {
    const life = makeLife();
    life.markHealthAccess(true);
    const last = new Date(NOW.getTime() - 30 * 60 * 1000);
    life.recordHealthRead(last.toISOString());
    const source = fakeSource({ samples: [sample('new')] });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: false });

    expect(result).toMatchObject({ status: 'read', added: 1 });
    expect(source.requested).toBe(0);
    expect(source.reads[0][0].getTime()).toBe(last.getTime() - OVERLAP_MS);
    expect(source.reads[0][1]).toEqual(NOW);
    expect(life.state.healthSync.lastReadAt).toBe(NOW.toISOString());
  });

  it('does not advance the last read when the source failed, so nothing is lost', async () => {
    const life = makeLife();
    life.markHealthAccess(true);
    const source = fakeSource({ failed: true });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: false });

    expect(result.status).toBe('read');
    expect(result.failed).toBe(true);
    expect(life.state.healthSync.lastReadAt).toBeNull();
  });

  it('is a no-op when the source is unavailable', async () => {
    const life = makeLife();
    const source = fakeSource({ status: { state: 'unavailable', message: 'Requiere un development build en un iPhone.' } });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: true });
    expect(result).toMatchObject({ status: 'unavailable', message: 'Requiere un development build en un iPhone.' });
    expect(life.state.queue).toHaveLength(0);
  });

  it('discards the read when the session changed while reading', async () => {
    const life = makeLife();
    life.markHealthAccess(true);
    const source = fakeSource({ samples: [sample('a')] });
    const original = source.readGranted!.bind(source);
    source.readGranted = async (from, to) => {
      life.beginSessionChange();
      life.endSessionChange();
      return original(from, to);
    };
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: false });
    expect(result.status).toBe('stale_session');
    expect(life.state.samples).toHaveLength(0);
  });

  it('does nothing while a session change is in progress', async () => {
    const life = makeLife();
    life.markHealthAccess(true);
    life.beginSessionChange();
    const source = fakeSource({ samples: [sample('a')] });
    const result = await collectAndEnqueue({ source, life, now: () => NOW, interactive: false });
    expect(result.status).toBe('stale_session');
    expect(source.reads).toHaveLength(0);
  });
});
