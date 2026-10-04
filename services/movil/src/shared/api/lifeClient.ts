import type { SyncItem } from '../../modules/health-sync/domain/syncQueue';

export function apiBaseUrl(): string | undefined {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  return value ? value.replace(/\/$/, '') : undefined;
}

export async function postLifeBatch(baseUrl: string, items: SyncItem[]): Promise<boolean> {
  const response = await fetch(`${baseUrl}/api/life/sync`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return response.ok;
}

export async function fetchDischargeBody(baseUrl: string, code: string): Promise<string | null> {
  const response = await fetch(`${baseUrl}/api/life/discharge-plans/${encodeURIComponent(code)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return null;
  }
  return response.text();
}
