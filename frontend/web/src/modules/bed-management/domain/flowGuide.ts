/** Circuito del proceso 5 (docs/architecture/modulo-5-camas.md), en el orden en que ocurre. */
export const PROCESS_STEPS = [
  { id: "solicitud", label: "Registrar solicitud", owner: "Gestión de camas", rf: "RF-68" },
  { id: "asignacion", label: "Asignar lecho compatible", owner: "Gestión de camas", rf: "RF-72, RF-73" },
  { id: "egreso", label: "Egreso del paciente", owner: "Enfermera de piso", rf: "RF-74" },
  { id: "desinfeccion", label: "Desinfección", owner: "Servicios generales", rf: "RF-75" },
  { id: "equipamiento", label: "Equipamiento", owner: "Auxiliar de enfermería", rf: "RF-76" },
  { id: "habilitacion", label: "Habilitar en el censo", owner: "Enfermera supervisora", rf: "RF-77" },
] as const;

export type ProcessStepId = (typeof PROCESS_STEPS)[number]["id"];

export type GuideCounts = {
  waiting: number;
  notifications: number;
  pendingDisinfect: number;
  toEquip: number;
  toEnable: number;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Siguiente paso concreto para el rol, derivado de su cola real de trabajo. */
export function guideFor(role: string, counts: GuideCounts): { headline: string; detail: string; step: ProcessStepId } {
  switch (role) {
    case "gestion_camas":
      return counts.waiting > 0
        ? {
            headline: `Tiene ${plural(counts.waiting, "solicitud en espera", "solicitudes en espera")}`,
            detail: "Revise la lista de espera y asigne el lecho compatible sugerido; la supervisora será notificada.",
            step: "asignacion",
          }
        : {
            headline: "Registre una solicitud de cama",
            detail: "Use «Nueva solicitud» cuando urgencias, quirófano o admisión pidan un lecho.",
            step: "solicitud",
          };
    case "enfermera_supervisora":
      if (counts.toEnable > 0) {
        return {
          headline: `Hay ${plural(counts.toEnable, "unidad equipada", "unidades equipadas")} por habilitar`,
          detail: "Valide la habitabilidad y habilítela en el censo para que vuelva a estar disponible.",
          step: "habilitacion",
        };
      }
      if (counts.notifications > 0) {
        return {
          headline: `Confirme ${plural(counts.notifications, "asignación nueva", "asignaciones nuevas")}`,
          detail: "Gestión de camas asignó lechos; marque cada notificación como recibida.",
          step: "asignacion",
        };
      }
      return {
        headline: "Registre proyecciones de alta",
        detail: "Anticipe la disponibilidad futura indicando la hora prevista de alta de cada paciente.",
        step: "habilitacion",
      };
    case "servicios_generales":
      return counts.pendingDisinfect > 0
        ? {
            headline: `Tiene ${plural(counts.pendingDisinfect, "desinfección pendiente", "desinfecciones pendientes")}`,
            detail: "Complete el checklist de cada unidad y registre la desinfección terminada.",
            step: "desinfeccion",
          }
        : {
            headline: "Sin desinfecciones pendientes",
            detail: "Las órdenes aparecen aquí automáticamente cuando se registra el egreso de un paciente.",
            step: "egreso",
          };
    case "auxiliar_enfermeria":
      return counts.toEquip > 0
        ? {
            headline: `Tiene ${plural(counts.toEquip, "unidad por equipar", "unidades por equipar")}`,
            detail: "Coloque la lencería y los insumos y marque cada unidad como equipada.",
            step: "equipamiento",
          }
        : {
            headline: "Sin unidades por equipar",
            detail: "Las unidades llegan aquí cuando servicios generales termina la desinfección.",
            step: "desinfeccion",
          };
    default:
      return {
        headline: "Consulte el estado de las camas",
        detail: "Su rol tiene acceso de lectura a este tablero.",
        step: "solicitud",
      };
  }
}

/** «Hace 14 min», «Hace 3 h», «Hace 2 d». */
export function elapsedLabel(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return "Hace instantes";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}
