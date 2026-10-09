export type SyncItem = {
  id: string;
  kind: 'biometrics' | 'consent' | 'plan';
  body: string;
  status: 'pending' | 'synced';
};

export type FlushDecision = {
  send: SyncItem[];
  pendingReason: 'offline' | 'no_api' | null;
};

export function enqueueSync(queue: SyncItem[], item: Omit<SyncItem, 'status'>): SyncItem[] {
  if (queue.some((entry) => entry.id === item.id)) {
    return queue;
  }
  return [...queue, { ...item, status: 'pending' }];
}

export function decideFlush(queue: SyncItem[], online: boolean, apiConfigured: boolean): FlushDecision {
  const pending = queue.filter((item) => item.status === 'pending');
  if (!online) {
    return { send: [], pendingReason: pending.length > 0 ? 'offline' : null };
  }
  if (!apiConfigured) {
    return { send: [], pendingReason: pending.length > 0 ? 'no_api' : null };
  }
  return { send: pending, pendingReason: null };
}

export function markSynced(queue: SyncItem[], ids: string[]): SyncItem[] {
  const sent = new Set(ids);
  return queue.map((item) => (sent.has(item.id) ? { ...item, status: 'synced' } : item));
}

export function pendingCount(queue: SyncItem[]): number {
  return queue.filter((item) => item.status === 'pending').length;
}

export function syncStatusLabel(online: boolean, pending: number, apiConfigured: boolean, lastServerSyncAt: string | null): string {
  if (!online) {
    return 'Sin conexión';
  }
  if (apiConfigured && pending > 0) {
    return 'Pendiente';
  }
  if (apiConfigured && lastServerSyncAt && pending === 0) {
    return 'Sincronizado';
  }
  return 'En el teléfono';
}
