/** Clave de día local YYYY-MM-DD a partir de un ISO datetime. */
export function dayKey(value: string | null | undefined): string {
  if (!value) return "sin-fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin-fecha";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DateRangePreset = "hoy" | "7d" | "30d" | "todo" | "custom";

export type DateRangeValue = {
  preset: DateRangePreset;
  from: string | null;
  to: string | null;
};

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveDateRange(preset: DateRangePreset, from?: string | null, to?: string | null): DateRangeValue {
  const today = startOfLocalDay();
  if (preset === "hoy") {
    return { preset, from: toInputDate(today), to: toInputDate(today) };
  }
  if (preset === "7d") {
    const start = startOfLocalDay(new Date(today));
    start.setDate(start.getDate() - 6);
    return { preset, from: toInputDate(start), to: toInputDate(today) };
  }
  if (preset === "30d") {
    const start = startOfLocalDay(new Date(today));
    start.setDate(start.getDate() - 29);
    return { preset, from: toInputDate(start), to: toInputDate(today) };
  }
  if (preset === "custom") {
    return { preset, from: from || null, to: to || null };
  }
  return { preset: "todo", from: null, to: null };
}

export function isWithinDateRange(iso: string | null | undefined, range: DateRangeValue): boolean {
  if (range.preset === "todo" || (!range.from && !range.to)) return true;
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  if (range.from) {
    const from = startOfLocalDay(new Date(`${range.from}T00:00:00`)).getTime();
    if (time < from) return false;
  }
  if (range.to) {
    const to = endOfLocalDay(new Date(`${range.to}T00:00:00`)).getTime();
    if (time > to) return false;
  }
  return true;
}

export type DayGroup<T> = { day: string; label: string; items: T[] };

export function groupByDay<T>(
  items: T[],
  getIso: (item: T) => string | null | undefined,
  formatLabel: (iso: string | null | undefined) => string,
): DayGroup<T>[] {
  const map = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const iso = getIso(item);
    const key = dayKey(iso);
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, { day: key, label: key === "sin-fecha" ? "Sin fecha" : formatLabel(iso), items: [item] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.day.localeCompare(a.day));
}

export function rangeQuery(range: DateRangeValue): string {
  if (!range.from && !range.to) return "";
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
