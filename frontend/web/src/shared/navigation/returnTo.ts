import type { DateRangeValue } from "../datetime/range";
import { isWithinDateRange } from "../datetime/range";

/** Base ficticia: solo permite a `URL` resolver rutas relativas; nunca se hace una petición. */
const URL_BASE = "https://vitalsy.local";

/** Ruta segura de retorno (solo paths relativos internos). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return null;
  return value;
}

export function withNextParam(path: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (!safe) return path;
  const url = new URL(path, URL_BASE);
  url.searchParams.set("next", safe);
  return `${url.pathname}${url.search}`;
}

export function withIngresoParam(path: string, encounterId: string): string {
  const url = new URL(path, URL_BASE);
  url.searchParams.set("ingreso", encounterId);
  return `${url.pathname}${url.search}`;
}

export function filterByRange<T>(
  items: T[],
  getIso: (item: T) => string | null | undefined,
  range: DateRangeValue | undefined,
): T[] {
  if (!range) return items;
  return items.filter((item) => isWithinDateRange(getIso(item), range));
}
