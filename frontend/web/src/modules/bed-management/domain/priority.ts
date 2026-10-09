const PRIORITY: Record<string, string> = {
  critica: "Prioridad 1: Crítica",
  alta: "Prioridad 2: Alta",
  media: "Prioridad 3: Media",
  baja: "Prioridad 4: Baja",
};

const REQUEST_STATUS: Record<string, string> = {
  en_espera: "En lista de espera",
  pendiente: "Con lecho compatible",
  asignada: "Asignada",
};

const SOURCE: Record<string, string> = {
  urgencias: "Urgencias",
  quirofano: "Quirófano",
  admisiones: "Admisión",
};

const ISOLATION: Record<string, string> = {
  gotas: "gotas",
  contacto: "contacto",
  respiratorio: "respiratorio / aerosoles",
};

const EQUIPMENT: Record<string, string> = {
  oxigeno_central: "oxígeno central",
  monitor: "monitor multiparámetro",
};

export const priorityLabel = (priority: string): string => PRIORITY[priority] ?? priority;
export const requestStatusLabel = (status: string): string => REQUEST_STATUS[status] ?? status;
export const sourceLabel = (source: string | undefined): string => (source ? (SOURCE[source] ?? source) : "—");

export function requirementLabel(request: {
  isolation: boolean;
  isolationType?: string | null;
  equipment?: string[];
}): string {
  const parts: string[] = [];
  if (request.isolation) {
    const kind = request.isolationType ? ISOLATION[request.isolationType] : undefined;
    parts.push(kind ? `aislamiento por ${kind}` : "aislamiento");
  }
  for (const item of request.equipment ?? []) parts.push(EQUIPMENT[item] ?? item);
  return parts.length === 0 ? "Requiere: cama convencional" : `Requiere: ${parts.join(" + ")}`;
}
