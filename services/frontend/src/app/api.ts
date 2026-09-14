const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? "No se pudo completar la operación.");
  }
  return data as T;
}
