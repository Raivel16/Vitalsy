import {
  buildReportQuery,
  defaultReportFilters,
  validateReportFilters,
  type ReportFilterErrors,
  type ResponseTimes,
} from "../../clinical-alerts/domain/report";

/** RF-115: indicadores hospitalarios (`GET /reports/hospital`). */
export type WardOption = { code: string; name: string };

export type BedsByWard = { code: string; name: string; total: number; occupied: number; occupancyPercent: number | null };

export type FlowRow = { date: string; admissions: number; discharges: number };

export type HospitalReport = {
  period: { from: string; to: string };
  filters: { ward: string | null };
  options: { wards: WardOption[] };
  beds: {
    total: number;
    occupied: number;
    available: number;
    cleaning: number;
    blocked: number;
    occupancyPercent: number | null;
    byWard: BedsByWard[];
  };
  flow: { admissions: number; discharges: number; averageStayHours: number | null; daily: FlowRow[] };
  turnover: { completed: number; pending: number; averageMinutes: number | null };
  alerts: { totalAlerts: number; activeAlerts: number; nurseAcknowledgement: ResponseTimes & { pending: number } };
};

export type HospitalFilters = { from: string; to: string; ward: string };

const decimal = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

export function defaultHospitalFilters(today = new Date()): HospitalFilters {
  const { from, to } = defaultReportFilters(today);
  return { from, to, ward: "" };
}

/** Validación previa al envío: mismas reglas de período que la API. */
export function validateHospitalFilters(filters: HospitalFilters): ReportFilterErrors {
  return validateReportFilters(filters);
}

export function buildHospitalQuery(filters: HospitalFilters): string {
  const query = buildReportQuery({ ...filters, severity: "", source: "", service: "" });
  return filters.ward ? `${query}&ward=${encodeURIComponent(filters.ward)}` : query;
}

export function formatHours(value: number | null): string {
  return value === null ? "—" : `${decimal.format(value)} h`;
}
