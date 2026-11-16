import { toInputDate } from "../../../shared/datetime/range";
import { STATUS_LABEL as ALERT_STATUS_LABEL } from "./alert";

/** Mismas etiquetas de estado que la bandeja y el detalle de alertas. */
export const STATUS_LABEL: Record<string, string> = ALERT_STATUS_LABEL;

/** RF-114: reporte de monitoreo y respuesta a alertas (`GET /clinical-alerts/reports`). */
export const REPORT_DEFAULT_DAYS = 7;
export const REPORT_MAX_DAYS = 90;
const DAY_MS = 86_400_000;

export type CountByKey = { key: string; count: number };

export type ResponseTimes = {
  targetMinutes: number;
  measured: number;
  averageMinutes: number | null;
  withinTargetPercent: number | null;
};

export type DailyRow = { date: string; total: number; alta: number; media: number; baja: number };

export type AlertReport = {
  period: { from: string; to: string };
  filters: { severity: string | null; source: string | null; service: string | null };
  options: { services: string[] };
  summary: { totalAlerts: number; closedAlerts: number; activeAlerts: number; icuTransfers: number };
  nurseAcknowledgement: ResponseTimes & { pending: number };
  escalation: { escalatedAlerts: number; ratePercent: number | null; toSupervisor: number; toRapidResponse: number };
  medicalResponse: ResponseTimes & { notified: number };
  bySeverity: CountByKey[];
  bySource: CountByKey[];
  byStatus: CountByKey[];
  news2Distribution: Array<{ band: string; count: number }>;
  daily: DailyRow[];
};

export type ReportFilters = { from: string; to: string; severity: string; source: string; service: string };

export type ReportFilterErrors = Partial<Record<"from" | "to", string>>;

export const SEVERITY_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export const SOURCE_LABEL: Record<string, string> = {
  news2: "NEWS2 (monitoreo)",
  observacion: "Deterioro observado",
  control: "Control vencido",
  emar: "Dosis pendiente (e-MAR)",
};

export function defaultReportFilters(today = new Date()): ReportFilters {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (REPORT_DEFAULT_DAYS - 1));
  return { from: toInputDate(from), to: toInputDate(today), severity: "", source: "", service: "" };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Validación previa al envío: mismas reglas que la API. */
export function validateReportFilters(filters: ReportFilters): ReportFilterErrors {
  if (!filters.from) return { from: "Indique la fecha inicial." };
  if (!filters.to) return { to: "Indique la fecha final." };
  const days = daysBetween(filters.from, filters.to);
  if (days < 0) return { to: "La fecha final no puede ser anterior a la inicial." };
  if (days >= REPORT_MAX_DAYS) return { from: `El período no puede superar ${REPORT_MAX_DAYS} días.` };
  return {};
}

export function buildReportQuery(filters: ReportFilters): string {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  for (const key of ["severity", "source", "service"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return params.toString();
}

const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

export function formatMinutes(value: number | null): string {
  return value === null ? "—" : `${decimal.format(value)} min`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${decimal.format(value)} %`;
}

export function labelFor(labels: Record<string, string>, key: string): string {
  return labels[key] ?? key;
}
