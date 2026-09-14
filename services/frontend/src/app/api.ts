import { userMessage } from "./userMessage";
import type { SessionUser } from "./roles";

const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function xsrfToken(): string {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function fallbackFor(status: number): string {
  if (status === 401) return "Debe iniciar sesión para continuar.";
  if (status === 403) return "No tiene permiso para esta acción.";
  if (status === 404) return "No se encontró lo solicitado.";
  if (status === 419) return "La sesión expiró. Vuelva a intentarlo.";
  if (status === 422) return "Revise los datos e intente de nuevo.";
  return "No se pudo completar la operación. Intente de nuevo.";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(xsrfToken() ? { "X-XSRF-TOKEN": xsrfToken() } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("No hay conexión con el servidor. Intente de nuevo.");
  }

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(userMessage(data.message, fallbackFor(response.status)));
  }
  return data as T;
}

export async function loginRequest(email: string, password: string): Promise<{ user: SessionUser }> {
  await fetch(`${baseUrl}/sanctum/csrf-cookie`, { credentials: "include" });
  return api("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
