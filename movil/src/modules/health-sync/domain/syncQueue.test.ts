import { decideFlush, enqueueSync, markSynced, pendingCount, syncStatusLabel } from './syncQueue';

describe('sync queue', () => {
  it('keeps samples pending while the device is offline', () => {
    const queue = enqueueSync([], { id: 'b1', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, false, true);
    expect(decision.send).toEqual([]);
    expect(decision.pendingReason).toBe('offline');
    expect(pendingCount(queue)).toBe(1);
  });

  it('does not pretend a cloud sync when no API is configured', () => {
    const queue = enqueueSync([], { id: 'b1', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, true, false);
    expect(decision.send).toEqual([]);
    expect(decision.pendingReason).toBe('no_api');
  });

  it('sends pending items only when online and the API is configured', () => {
    const queue = enqueueSync([], { id: 'b1', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, true, true);
    expect(decision.send.map((item) => item.id)).toEqual(['b1']);
    expect(markSynced(queue, ['b1']).every((item) => item.status === 'synced')).toBe(true);
  });

  it('never labels a local-only queue as synced to the cloud', () => {
    expect(syncStatusLabel(true, 2, false, null)).toBe('En el teléfono');
    expect(syncStatusLabel(false, 1, true, null)).toBe('Sin conexión');
    expect(syncStatusLabel(true, 0, true, '2026-10-03T12:00:00.000Z')).toBe('Sincronizado');
  });

  it('ignores a duplicate enqueue', () => {
    const once = enqueueSync([], { id: 'b1', kind: 'consent', body: '{}' });
    const twice = enqueueSync(once, { id: 'b1', kind: 'consent', body: '{}' });
    expect(twice).toHaveLength(1);
  });
});
