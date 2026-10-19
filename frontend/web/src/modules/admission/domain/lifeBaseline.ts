export type LifeMetric = { kind: string; low: number; high: number; days: number };
export type LifeBaseline = { importedAt: string | null; metrics: LifeMetric[] };

const KIND_LABEL: Record<string, string> = {
  heart_rate: "Pulso",
  resting_heart_rate: "Pulso en reposo",
  hrv: "Variabilidad cardíaca",
  spo2: "SpO₂",
  skin_temperature: "Temperatura cutánea",
  body_temperature: "Temperatura corporal",
};

const KIND_UNIT: Record<string, string> = {
  heart_rate: "lpm",
  resting_heart_rate: "lpm",
  hrv: "ms",
  spo2: "%",
  skin_temperature: "°C",
  body_temperature: "°C",
};

const LINK_ERROR_MESSAGE: Record<string, string> = {
  code_not_found: "No reconocemos ese código.",
  code_consumed: "Este código ya fue usado.",
  code_expired: "El código venció. Pida al paciente que genere uno nuevo en la app.",
  sharing_closed: "El paciente tiene la compartición cerrada en la app.",
  already_linked: "Este ingreso ya tiene una línea de base vinculada.",
};

export function lifeKindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

export function lifeMetricRange(metric: LifeMetric): string {
  const unit = KIND_UNIT[metric.kind];
  const suffix = unit ? ` ${unit}` : "";
  return `${metric.low}–${metric.high}${suffix}`;
}

/** Texto en español para un código de error de vinculación; undefined si no está mapeado. */
export function lifeLinkErrorMessage(code: string | undefined): string | undefined {
  return code ? LINK_ERROR_MESSAGE[code] : undefined;
}

const BASELINE_READER_ROLES: ReadonlySet<string> = new Set(["admision", "enfermera_piso", "medico_residente", "medico_tratante"]);

/** Roles que el backend autoriza a leer la línea de base domiciliaria. */
export function canReadLifeBaseline(role: string | null | undefined): boolean {
  return Boolean(role) && BASELINE_READER_ROLES.has(role as string);
}
