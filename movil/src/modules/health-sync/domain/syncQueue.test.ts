import { applySyncResult, chunkForSend, decideFlush, enqueueSync, pendingCount, syncStatusLabel } from './syncQueue';

describe('sync queue', () => {
  it('keeps samples pending while the device is offline', () => {
    const queue = enqueueSync([], { id: 'b1', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, false, true, true);
    expect(decision.send).toEqual([]);
    expect(decision.pendingReason).toBe('offline');
    expect(pendingCount(queue)).toBe(1);
  });

  it('does not pretend a cloud sync when no API is configured', () => {
    const queue = enqueueSync([], { id: 'b1', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, true, false, true);
    expect(decision.send).toEqual([]);
    expect(decision.pendingReason).toBe('no_api');
  });

  it('sends pending items only when online and the API is configured', () => {
    const queue = enqueueSync([], { id: 'b1', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, true, true, true);
    expect(decision.send.map((item) => item.id)).toEqual(['b1']);
    expect(applySyncResult(queue, ['b1'], []).every((item) => item.status === 'synced')).toBe(true);
  });

  it('never labels a local-only queue as synced to the cloud', () => {
    expect(syncStatusLabel(true, 2, false, null)).toBe('En el teléfono');
    expect(syncStatusLabel(false, 1, true, null)).toBe('Sin conexión');
    expect(syncStatusLabel(true, 0, true, '2026-10-03T12:00:00.000Z')).toBe('Sincronizado');
  });

  it('marks synced only the accepted ids and rejected ones terminally', () => {
    let queue = enqueueSync([], { id: 'a', kind: 'biometrics', body: '[]' });
    queue = enqueueSync(queue, { id: 'b', kind: 'biometrics', body: '[]' });
    queue = enqueueSync(queue, { id: 'c', kind: 'consent', body: '{}' });
    const next = applySyncResult(queue, ['a'], [{ id: 'b', reason: 'invalid' }, { id: '0', reason: 'index' }]);
    expect(next.map((item) => item.status)).toEqual(['synced', 'rejected', 'pending']);
    expect(next[1].rejectedReason).toBe('invalid');
    expect(pendingCount(next)).toBe(1);
    expect(decideFlush(next, true, true, true).send.map((item) => item.id)).toEqual(['c']);
  });

  it('reports no_session without sending when there is no token', () => {
    const queue = enqueueSync([], { id: 'a', kind: 'biometrics', body: '[]' });
    const decision = decideFlush(queue, true, true, false);
    expect(decision.send).toEqual([]);
    expect(decision.pendingReason).toBe('no_session');
  });

  it('chunks pending items by count and by body size', () => {
    const items = Array.from({ length: 250 }, (_, index) => ({ id: `i${index}`, kind: 'biometrics' as const, body: '[]', status: 'pending' as const }));
    const chunks = chunkForSend(items);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 50]);
    const heavy = ['x', 'y', 'z'].map((id) => ({ id, kind: 'biometrics' as const, body: 'a'.repeat(400_000), status: 'pending' as const }));
    expect(chunkForSend(heavy).map((chunk) => chunk.length)).toEqual([2, 1]);
    expect(chunkForSend([])).toEqual([]);
  });

  it('ignores a duplicate enqueue', () => {
    const once = enqueueSync([], { id: 'b1', kind: 'consent', body: '{}' });
    const twice = enqueueSync(once, { id: 'b1', kind: 'consent', body: '{}' });
    expect(twice).toHaveLength(1);
  });
});
