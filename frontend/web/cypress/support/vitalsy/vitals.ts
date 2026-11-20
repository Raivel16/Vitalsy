// Constantes vitales deterministas para los escenarios del módulo 3 (NEWS2 RCP 2017, escala 1 de SpO2).

export type VitalsProfile = "normal" | "news2_medio" | "news2_alto";

export type VitalsInput = {
  respiratoryRate: number;
  oxygenSaturation: number;
  systolicBloodPressure: number;
  diastolicBloodPressure: number;
  pulse: number;
  temperature: number;
};

const BASE: VitalsInput = {
  respiratoryRate: 16,
  oxygenSaturation: 98,
  systolicBloodPressure: 120,
  diastolicBloodPressure: 75,
  pulse: 76,
  temperature: 36.8,
};

/** FR 22 (2) + SpO2 95 (1) + FC 112 (2) = 5; FR 26 (3) + SpO2 90 (3) + FC 115 (2) = 8. */
const PROFILES: Record<VitalsProfile, Partial<VitalsInput>> = {
  normal: {},
  news2_medio: { respiratoryRate: 22, oxygenSaturation: 95, pulse: 112 },
  news2_alto: { respiratoryRate: 26, oxygenSaturation: 90, pulse: 115 },
};

export const EXPECTED_NEWS2: Record<VitalsProfile, number> = { normal: 0, news2_medio: 5, news2_alto: 8 };

export function vitalsFor(profile: VitalsProfile): VitalsInput {
  return { ...BASE, ...PROFILES[profile] };
}

/** Cuerpo de la API para admisión, monitoreo y reevaluación de alertas. */
export function vitalsBody(profile: VitalsProfile) {
  return {
    ...vitalsFor(profile),
    spo2Scale: "scale1",
    supplementalOxygen: false,
    consciousness: "alert",
  };
}

/** Severidad que asigna el backend a una alerta NEWS2 (`AlertRecorder`). */
export function severityFor(news2: number): "alta" | "media" {
  return news2 >= 7 ? "alta" : "media";
}
