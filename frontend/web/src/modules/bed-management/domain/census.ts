import type { Bed, BedRequest, WardCensus } from "../types";

export type CensusTotals = {
  capacity: number;
  available: number;
  occupied: number;
  cleaning: number;
  isolation: number;
};

/** Capacidad operativa = disponibles + ocupadas + en limpieza (las bloqueadas no cuentan). */
export function censusTotals(wards: WardCensus[]): CensusTotals {
  const sum = (pick: (ward: WardCensus) => number) => wards.reduce((total, ward) => total + pick(ward), 0);
  const available = sum((ward) => ward.available);
  const occupied = sum((ward) => ward.occupied);
  const cleaning = sum((ward) => ward.cleaning);
  return {
    capacity: available + occupied + cleaning,
    available,
    occupied,
    cleaning,
    isolation: sum((ward) => ward.beds.filter((bed) => bed.isolation).length),
  };
}

export function sharePct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Agrupa las camas por habitación, ordenadas por número de habitación y código. */
export function groupByRoom(beds: Bed[]): Array<[string, Bed[]]> {
  const rooms = new Map<string, Bed[]>();
  for (const bed of beds) {
    const group = rooms.get(bed.room) ?? [];
    group.push(bed);
    rooms.set(bed.room, group);
  }
  return [...rooms.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "es", { numeric: true }))
    .map(([room, group]) => [room, [...group].sort((a, b) => a.bedCode.localeCompare(b.bedCode))]);
}

/** «Medicina Interna A» → «MI»; «Cirugía B» → «CB». */
export function wardInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length === 1 ? words[0].slice(0, 2) : words.slice(0, 2).map((word) => word[0]).join("");
  return letters.toUpperCase();
}

/** Días de internación contando el de ingreso (día 1). */
export function occupiedDays(since: string | null | undefined, now: number = Date.now()): number | null {
  if (!since) return null;
  const start = new Date(since).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(1, Math.floor((now - start) / 86400000) + 1);
}

/**
 * Solicitudes atendibles con este lecho. Replica `BedCompatibility` del servidor
 * (RF-72) solo para orientar la interfaz; el servidor sigue siendo la autoridad.
 */
export function compatibleRequests(bed: Bed, ward: WardCensus, requests: BedRequest[]): BedRequest[] {
  return requests.filter((request) => {
    if (request.status !== "pendiente" && request.status !== "en_espera") return false;
    if (request.isolation !== bed.isolation) return false;
    if (request.specialty && ward.specialty !== request.specialty) return false;
    if (request.gender && bed.genderPolicy && !["mixed", request.gender].includes(bed.genderPolicy)) return false;
    return true;
  });
}
