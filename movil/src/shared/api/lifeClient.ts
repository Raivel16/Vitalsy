import type { SyncItem } from '../../modules/health-sync/domain/syncQueue';
import { lifeErrorMessage } from './lifeClient.errors';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: string; message: string; errors?: Record<string, string> };

export type ServerNotice = {
  id: string;
  kind: 'preventivo' | 'habito';
  title: string;
  body: string;
  metric: string | null;
  createdAt: string;
};

function normaliseNotices(data: unknown): { notices: ServerNotice[] } | null {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  if (!record || !Array.isArray(record.notices)) {
    return null;
  }
  const notices: ServerNotice[] = [];
  for (const entry of record.notices) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      (item.kind !== 'preventivo' && item.kind !== 'habito') ||
      typeof item.title !== 'string' ||
      typeof item.body !== 'string' ||
      typeof item.createdAt !== 'string'
    ) {
      continue;
    }
    notices.push({
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      metric: typeof item.metric === 'string' ? item.metric : null,
      createdAt: item.createdAt,
    });
  }
  return { notices };
}

export type LifeAccount ={ id: number; name: string; email: string };
export type AuthPayload = { token: string; account: LifeAccount };

export function apiBaseUrl(): string | undefined {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) {
    return undefined;
  }
  const url = value.replace(/\/$/, '');
  const secure = /^https:\/\//i.test(url);
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  return secure || dev ? url : undefined;
}

type Options = { method: 'GET' | 'POST' | 'PUT'; body?: unknown; auth: boolean; raw?: boolean };

export type SyncResponse = { accepted: string[]; rejected: { id: string; reason: string }[] };

function normaliseSync(data: unknown): SyncResponse | null {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  if (!record || !Array.isArray(record.accepted)) {
    return null;
  }
  const accepted = record.accepted.filter((id) => typeof id === 'string' || typeof id === 'number').map(String);
  const rejected = Array.isArray(record.rejected)
    ? record.rejected
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .filter((entry) => typeof entry.id === 'string' || typeof entry.id === 'number')
        .map((entry) => ({ id: String(entry.id), reason: typeof entry.reason === 'string' ? entry.reason : 'rejected' }))
    : [];
  return { accepted, rejected };
}

function fieldErrors(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [field, raw] of Object.entries(value as Record<string, unknown>)) {
    const first = Array.isArray(raw) ? raw.find((item) => typeof item === 'string') : raw;
    if (typeof first === 'string') {
      out[field] = first;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function createLifeClient(baseUrl: string, getToken: () => Promise<string | null>) {
  async function request<T>(path: string, options: Options): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.auth) {
      const token = await getToken().catch(() => null);
      if (!token) {
        return { ok: false, status: 401, code: 'no_session', message: lifeErrorMessage(401, 'no_session') };
      }
      headers.Authorization = `Bearer ${token}`;
    }
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/life/${path}`, {
        method: options.method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      return { ok: false, status: 0, message: 'Sin conexión' };
    }
    const text = await response.text().catch(() => '');
    if (!response.ok) {
      const parsed = parseJson(text);
      const code = typeof parsed?.code === 'string' ? parsed.code : undefined;
      const serverMessage = typeof parsed?.message === 'string' ? parsed.message : undefined;
      if (!options.auth && response.status === 401 && !code) {
        return { ok: false, status: 401, message: 'Correo o contraseña incorrectos.' };
      }
      const errors = response.status === 422 ? fieldErrors(parsed?.errors) : undefined;
      return {
        ok: false,
        status: response.status,
        code,
        message: lifeErrorMessage(response.status, code, serverMessage),
        ...(errors ? { errors } : {}),
      };
    }
    if (options.raw) {
      return { ok: true, data: text as unknown as T };
    }
    if (response.status === 204 || text === '') {
      return { ok: true, data: undefined as unknown as T };
    }
    const parsed = parseJson(text);
    if (!parsed) {
      return { ok: false, status: response.status, message: lifeErrorMessage(500) };
    }
    return { ok: true, data: parsed as T };
  }

  return {
    register: (input: { name: string; email: string; password: string }) =>
      request<AuthPayload>('auth/register', { method: 'POST', body: input, auth: false }),
    login: (input: { email: string; password: string }) => request<AuthPayload>('auth/login', { method: 'POST', body: input, auth: false }),
    logout: () => request<undefined>('auth/logout', { method: 'POST', auth: true }),
    sync: async (items: SyncItem[]): Promise<ApiResult<SyncResponse>> => {
      const result = await request<Record<string, unknown>>('sync', { method: 'POST', body: { items }, auth: true });
      if (!result.ok) {
        return result;
      }
      const normalised = normaliseSync(result.data);
      if (!normalised) {
        return { ok: false, status: 200, code: 'invalid_response', message: 'La respuesta del servidor no es válida. Reintentaremos más tarde.' };
      }
      return { ok: true, data: normalised };
    },
    setConsent: (sharingEnabled: boolean) =>
      request<{ sharingEnabled: boolean; revokedAt: string | null }>('consent', { method: 'PUT', body: { sharingEnabled }, auth: true }),
    issueLinkCode: () => request<{ code: string; expiresAt: string }>('link-codes', { method: 'POST', auth: true }),
    getNotices: async (): Promise<ApiResult<{ notices: ServerNotice[] }>> => {
      const result = await request<Record<string, unknown>>('notices', { method: 'GET', auth: true });
      if (!result.ok) {
        return result;
      }
      const normalised = normaliseNotices(result.data);
      if (!normalised) {
        return { ok: false, status: 200, code: 'invalid_response', message: 'La respuesta del servidor no es válida. Reintentaremos más tarde.' };
      }
      return { ok: true, data: normalised };
    },
    fetchDischargePlan: (code: string) =>
      request<string>(`discharge-plans/${encodeURIComponent(code)}`, { method: 'GET', auth: true, raw: true }),
  };
}

export type LifeClient = ReturnType<typeof createLifeClient>;
