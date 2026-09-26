export type AlertSeverity = "baja" | "media" | "alta";

export type AlertStatus =
  | "abierta"
  | "en_atencion"
  | "escalada_supervisora"
  | "medico_notificado"
  | "medico_en_atencion"
  | "err_solicitado"
  | "escalada_err"
  | "cerrada";

export type ClinicalAlert = {
  id: number;
  encounterId: string;
  patientName: string | null;
  location: string | null;
  source: string;
  severity: AlertSeverity;
  news2Total: number | null;
  message: string;
  status: AlertStatus;
  assignedRole: string | null;
  generatedAt: string | null;
  acknowledgeDueAt: string | null;
  medicalDueAt: string | null;
  closedAt: string | null;
};

export type AlertEvent = {
  id: number;
  type: string;
  detail: string | null;
  role: string | null;
  userName: string | null;
  occurredAt: string;
};

export type AlertEscalation = {
  toRole: string;
  reason: string;
  escalatedAt: string;
};

export const STATUS_LABEL: Record<AlertStatus, string> = {
  abierta: "Pendiente de recepción",
  en_atencion: "En atención de enfermería",
  escalada_supervisora: "Escalada a supervisión",
  medico_notificado: "Médico notificado",
  medico_en_atencion: "En atención médica",
  err_solicitado: "Equipo de respuesta rápida solicitado",
  escalada_err: "Escalada al equipo de respuesta rápida",
  cerrada: "Cerrada",
};

export const EVENT_LABEL: Record<string, string> = {
  generada: "Alerta generada",
  observacion: "Deterioro observado",
  recepcion: "Recepción confirmada",
  revaloracion: "Nueva toma de constantes",
  programacion: "Control programado",
  solicitud_medica: "Atención médica solicitada",
  atencion_medica: "Atención médica registrada",
  solicitud_err: "Equipo de respuesta rápida solicitado",
  evaluacion_err: "Evaluación del equipo de respuesta rápida",
  traslado_uci: "Orden de traslado a cuidados intensivos",
  escalamiento: "Escalamiento automático",
  cierre: "Evento cerrado",
};

/** RNF-15: el color del riesgo debe ser consistente en todas las pantallas. */
export function severityVisual(severity: AlertSeverity): "green" | "yellow" | "red" {
  if (severity === "alta") return "red";
  if (severity === "media") return "yellow";
  return "green";
}

export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ?? type;
}
