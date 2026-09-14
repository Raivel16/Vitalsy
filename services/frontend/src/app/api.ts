import { userMessage } from "./userMessage";

const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function fallbackFor(status: number): string {
  if (status === 401) return "Debe iniciar sesión para continuar.";
  if (status === 403) return "No tiene permiso para esta acción.";
  if (status === 404) return "No se encontró lo solicitado.";
  if (status === 422) return "Revise los datos e intente de nuevo.";
  return "No se pudo completar la operación. Intente de nuevo.";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("No hay conexión con el servidor. Intente de nuevo.");
  }

  const data = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(userMessage(data.message, fallbackFor(response.status)));
  }
  return data as T;
}
