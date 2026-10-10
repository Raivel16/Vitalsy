import type { ClinicalTone } from "../../../shared/ui/clinical";

/** Estado de una solicitud de cobertura expresado en el lenguaje del proceso. */
export function coverageStatus(status: string): { label: string; tone: ClinicalTone } {
  switch (status) {
    case "solicitada":
      return { label: "Pendiente de jefatura", tone: "warning" };
    case "aprobada_jefatura":
      return { label: "Pendiente de RRHH", tone: "info" };
    case "autorizada":
      return { label: "Lista para ingreso", tone: "success" };
    case "confirmada":
      return { label: "Retén en piso", tone: "neutral" };
    default:
      return { label: "Estado no reconocido", tone: "neutral" };
  }
}

/**
 * Carga clínica acumulada (suma de NEWS2 de sus pacientes). La carga no usa la paleta
 * NEWS2: la sobrecarga es «danger» y lo demás, neutro o éxito.
 */
export function loadLevel(weight: number): { label: string; tone: ClinicalTone } {
  if (weight >= 10) return { label: "Sobrecarga", tone: "danger" };
  if (weight >= 4) return { label: "Óptima", tone: "success" };
  return { label: "Holgada", tone: "neutral" };
}

export type ShiftKind = "dia" | "noche";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function nextDayShift(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Día: 07:00–19:00; noche: 19:00–07:00 del día siguiente. */
export function shiftWindow(isoDate: string, kind: ShiftKind): { startsAt: string; endsAt: string } {
  if (kind === "dia") return { startsAt: `${isoDate}T07:00:00`, endsAt: `${isoDate}T19:00:00` };
  return { startsAt: `${isoDate}T19:00:00`, endsAt: `${nextDayShift(isoDate)}T07:00:00` };
}

export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function yearMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Servicios del hospital (catálogo `wards`); el relevo de enfermería exige el mismo servicio. */
export const SERVICES = ["Medicina Interna A", "Cirugía B"] as const;

export const ABSENCE_REASONS = ["Inasistencia", "Descanso médico", "Licencia", "Permiso", "Otro"] as const;
