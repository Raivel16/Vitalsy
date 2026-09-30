export type AlertSeverity = "baja" | "media" | "alta";

export type AlertStatus =
  | "abierta"
  | "en_atencion"
  | "escalada_supervisora"
  | "medico_notificado"
  | "medico_en_atencion"
  | "err_solicitado"
  | "escalada_err"
  | "orden_uci"
  | "uci_autorizada"
  | "en_uci"
  | "cerrada";

export type IcuTransfer = {
  ordered: boolean;
  orderedAt: string | null;
  doctorAuthorized: boolean;
  doctorAuthorizedAt: string | null;
  nurseAuthorized: boolean;
  nurseAuthorizedAt: string | null;
  fullyAuthorized: boolean;
  transferredAt: string | null;
  returnedAt: string | null;
  previousLocation: { service?: string; room?: string; bed?: string } | null;
};

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
  followUpDueAt: string | null;
  reassessedAt: string | null;
  medicalDueAt: string | null;
  closedAt: string | null;
  needsSiren: boolean;
  icuTransfer?: IcuTransfer | null;
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
  orden_uci: "Orden de traslado a UCI",
  uci_autorizada: "Traslado a UCI autorizado",
  en_uci: "Paciente en UCI",
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
  orden_uci: "Orden de traslado a UCI",
  autorizacion_uci_medico: "Autorización médica de UCI",
  autorizacion_uci_enfermera: "Autorización de enfermería de UCI",
  uci_autorizada: "Traslado a UCI autorizado",
  traslado_uci_efectivo: "Traslado efectivo a UCI",
  retorno_sala: "Retorno a sala general",
  traslado_uci: "Orden de traslado a cuidados intensivos",
  escalamiento: "Escalamiento automático",
  seguimiento_vencido: "Seguimiento clínico vencido",
  cierre: "Evento cerrado",
};

/** RNF-16: el color del riesgo debe ser consistente en todas las pantallas. */
export function severityVisual(severity: AlertSeverity): "green" | "yellow" | "red" {
  if (severity === "alta") return "red";
  if (severity === "media") return "yellow";
  return "green";
}

export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ?? type;
}
