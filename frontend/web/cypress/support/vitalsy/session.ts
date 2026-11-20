// Cliente de la API de Vitalsy para las tareas de Cypress (Node): misma sesión SPA que la web
// (cookie de Sanctum + cabecera X-XSRF-TOKEN). Se inyecta `fetch` para poder probarlo con Vitest.

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type Wait = (ms: number) => Promise<void>;
export type RawResponse = { status: number; body: unknown };

const MAX_THROTTLE_RETRIES = 2;
const DEFAULT_RETRY_SECONDS = 60;

export class VitalsyApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(method: string, path: string, status: number, body: unknown) {
    const detail = typeof body === "object" && body !== null && "message" in body ? String(body.message) : JSON.stringify(body);
    super(`${method} ${path} → ${status}: ${detail}`);
    this.name = "VitalsyApiError";
    this.status = status;
    this.body = body;
  }
}

const defaultWait: Wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class VitalsySession {
  private readonly cookies = new Map<string, string>();
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private readonly wait: Wait;

  constructor(baseUrl: string, fetcher: FetchLike = fetch, wait: Wait = defaultWait) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetcher = fetcher;
    this.wait = wait;
  }

  async login(email: string, password: string): Promise<void> {
    await this.send("GET", "/sanctum/csrf-cookie");
    await this.request("POST", "/auth/login", { email, password });
  }

  /** Llamada a `/api/v1{path}` que falla si la respuesta no es 2xx. */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.raw(method, path, body);
    if (res.status < 200 || res.status >= 300) throw new VitalsyApiError(method, path, res.status, res.body);
    return res.body as T;
  }

  /** Respuesta sin interpretar para afirmar 403/422; reintenta si el servidor limita (429). */
  async raw(method: string, path: string, body?: unknown, attempt = 0): Promise<RawResponse> {
    const res = await this.send(method, `/api/v1${path}`, body);
    if (res.status === 429 && attempt < MAX_THROTTLE_RETRIES) {
      const seconds = Number(res.headers.get("retry-after")) || DEFAULT_RETRY_SECONDS;
      await this.wait(seconds * 1000);
      return this.raw(method, path, body, attempt + 1);
    }
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  private async send(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Origin: this.baseUrl,
      Referer: `${this.baseUrl}/`,
      "X-Requested-With": "XMLHttpRequest",
    };
    if (this.cookies.size > 0) {
      headers.Cookie = [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    const xsrf = this.cookies.get("XSRF-TOKEN");
    if (xsrf) headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrf);
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    this.storeCookies(res.headers.getSetCookie());
    return res;
  }

  private storeCookies(setCookies: string[]): void {
    for (const header of setCookies) {
      const [pair] = header.split(";");
      const index = pair.indexOf("=");
      if (index > 0) this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  }
}
