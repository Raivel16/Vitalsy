import { request, type APIRequestContext, type APIResponse } from "@playwright/test";
import { E2E_BASE_URL } from "./env";

// RNF-18: cliente de la API con la misma sesión SPA (cookie + XSRF) que usa la web.
const HEADERS = { Accept: "application/json", Origin: E2E_BASE_URL, Referer: `${E2E_BASE_URL}/` };

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(method: string, path: string, status: number, body: unknown) {
    const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : JSON.stringify(body);
    super(`${method} ${path} → ${status}: ${message}`);
    this.status = status;
    this.body = body;
  }
}

export class ApiSession {
  private readonly ctx: APIRequestContext;

  private constructor(ctx: APIRequestContext) {
    this.ctx = ctx;
  }

  static async login(email: string, password: string): Promise<ApiSession> {
    const session = new ApiSession(await request.newContext({ baseURL: E2E_BASE_URL, extraHTTPHeaders: HEADERS }));
    await session.ctx.get("/sanctum/csrf-cookie");
    await session.post("/auth/login", { email, password });
    return session;
  }

  static async fromStorage(file: string): Promise<ApiSession> {
    return new ApiSession(await request.newContext({ baseURL: E2E_BASE_URL, extraHTTPHeaders: HEADERS, storageState: file }));
  }

  /** Estado de cookies para abrir un navegador con esta misma sesión. */
  async storage() {
    return this.ctx.storageState();
  }

  async save(file: string): Promise<void> {
    await this.ctx.storageState({ path: file });
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  get<T>(path: string): Promise<T> {
    return this.json<T>("GET", path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.json<T>("POST", path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.json<T>("PUT", path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.json<T>("PATCH", path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.json<T>("DELETE", path);
  }

  /** Respuesta sin interpretar (para afirmar 401/403/422). La ruta es relativa a /api/v1. */
  async raw(method: string, path: string, body?: unknown): Promise<APIResponse> {
    const xsrf = (await this.ctx.storageState()).cookies.find((c) => c.name === "XSRF-TOKEN")?.value;
    return this.ctx.fetch(`/api/v1${path}`, {
      method,
      data: body,
      headers: xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {},
      failOnStatusCode: false,
    });
  }

  private async json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.raw(method, path, body);
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (!res.ok()) throw new ApiError(method, path, res.status(), parsed);
    return parsed as T;
  }
}
