import type { Role } from "../../../app/roles";

/** Estados de la orden de limpieza tal como los devuelve la API (RF-74 a RF-77). */
export type CleaningStatus = "pendiente" | "completada" | "equipada" | "habilitada";
export type CleaningAction = "disinfect" | "equip" | "enable";

export const CHECKLIST_ITEMS = [
  { key: "superficies", label: "Limpieza de superficies duras" },
  { key: "portasuero", label: "Desinfección de porta-suero" },
  { key: "colchon", label: "Cambio de colchón sanitario" },
  { key: "ventilacion", label: "Ventilación de ambiente (30 min)" },
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];
export type Checklist = Record<ChecklistKey, boolean>;

export const STAGES: ReadonlyArray<{ id: CleaningStatus; step: string; label: string; hint: string }> = [
  { id: "pendiente", step: "Etapa 1", label: "Sucia / solicitada", hint: "Servicios generales" },
  { id: "completada", step: "Etapa 2", label: "Desinfectada", hint: "Aux. enfermería" },
  { id: "equipada", step: "Etapa 3", label: "Equipada", hint: "Validación supervisora" },
  { id: "habilitada", step: "Etapa 4", label: "Lista / habilitada", hint: "Disponibles" },
];

const ACTION_BY_STATUS: Record<CleaningStatus, { role: Role; action: CleaningAction } | null> = {
  pendiente: { role: "servicios_generales", action: "disinfect" },
  completada: { role: "auxiliar_enfermeria", action: "equip" },
  equipada: { role: "enfermera_supervisora", action: "enable" },
  habilitada: null,
};

const OWNER_BY_STATUS: Record<CleaningStatus, string | null> = {
  pendiente: "Servicios generales",
  completada: "Auxiliar de enfermería",
  equipada: "Enfermera supervisora",
  habilitada: null,
};

const STATUS_LABEL: Record<CleaningStatus, string> = {
  pendiente: "Sucia / en espera",
  completada: "Desinfectada",
  equipada: "Equipada y verificada",
  habilitada: "Disponible",
};

/** Acción que corresponde a un rol sobre una orden; `null` si no le toca actuar. */
export function actionFor(role: Role | string, status: CleaningStatus): CleaningAction | null {
  const step = ACTION_BY_STATUS[status];
  return step && step.role === role ? step.action : null;
}

/** Quién debe actuar a continuación sobre la orden (para el texto «Esperando a…»). */
export function ownerOf(status: CleaningStatus): string | null {
  return OWNER_BY_STATUS[status];
}

export function statusLabel(status: CleaningStatus): string {
  return STATUS_LABEL[status];
}

export function protocolLabel(protocol: string): string {
  return protocol === "deep" ? "Desinfección profunda / terminal" : "Limpieza estándar";
}

export function emptyChecklist(): Checklist {
  return { superficies: false, portasuero: false, colchon: false, ventilacion: false };
}

export function checklistComplete(checklist: Partial<Record<ChecklistKey, boolean>>): boolean {
  return CHECKLIST_ITEMS.every((item) => checklist[item.key] === true);
}

export function stageCounts(orders: ReadonlyArray<{ status: string }>): Record<CleaningStatus, number> {
  const counts: Record<CleaningStatus, number> = { pendiente: 0, completada: 0, equipada: 0, habilitada: 0 };
  for (const order of orders) {
    if (order.status in counts) counts[order.status as CleaningStatus] += 1;
  }
  return counts;
}

/** «Habitación 312 · Cama B» — título común de una unidad en tarjetas y avisos. */
export function unitTitle(unit: { room: string | null; bedCode: string | null }): string {
  return `Habitación ${unit.room ?? "—"} · Cama ${unit.bedCode ?? "—"}`;
}
