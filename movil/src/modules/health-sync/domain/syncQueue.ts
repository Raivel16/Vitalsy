export type SyncItem = {
  id: string;
  kind: 'biometrics' | 'consent' | 'plan';
  body: string;
  status: 'pending' | 'synced' | 'rejected';
  rejectedReason?: string;
};

export type FlushDecision = {
  send: SyncItem[];
  pendingReason: 'offline' | 'no_api' | 'no_session' | null;
};

export const MAX_ITEMS_PER_REQUEST = 100;
export const MAX_CHARS_PER_REQUEST = 1_000_000;

export function chunkForSend(items: SyncItem[], maxItems = MAX_ITEMS_PER_REQUEST, maxChars = MAX_CHARS_PER_REQUEST): SyncItem[][] {
  const chunks: SyncItem[][] = [];
  let current: SyncItem[] = [];
  let chars = 0;
  for (const item of items) {
    const size = item.body.length;
    if (current.length > 0 && (current.length >= maxItems || chars + size > maxChars)) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += size;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

export function applySyncResult(queue: SyncItem[], accepted: string[], rejected: { id: string; reason: string }[]): SyncItem[] {
  const ok = new Set(accepted);
  const reasons = new Map(rejected.map((entry) => [entry.id, entry.reason]));
  return queue.map((item) => {
    if (item.status !== 'pending') {
      return item;
    }
    if (ok.has(item.id)) {
      return { ...item, status: 'synced' };
    }
    if (reasons.has(item.id)) {
      return { ...item, status: 'rejected', rejectedReason: reasons.get(item.id) };
    }
    return item;
  });
}

export function enqueueSync(queue: SyncItem[], item: Omit<SyncItem, 'status'>): SyncItem[] {
  if (queue.some((entry) => entry.id === item.id)) {
    return queue;
  }
  return [...queue, { ...item, status: 'pending' }];
}

export function decideFlush(queue: SyncItem[], online: boolean, apiConfigured: boolean, hasSession = true): FlushDecision {
  const pending = queue.filter((item) => item.status === 'pending');
  if (!online) {
    return { send: [], pendingReason: pending.length > 0 ? 'offline' : null };
  }
  if (!apiConfigured) {
    return { send: [], pendingReason: pending.length > 0 ? 'no_api' : null };
  }
  if (!hasSession) {
    return { send: [], pendingReason: pending.length > 0 ? 'no_session' : null };
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
