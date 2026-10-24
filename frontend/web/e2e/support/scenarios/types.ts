import type { Role } from "../../../src/app/roles";
import type { ApiSession } from "../api";
import type { DataGen, Patient, Vitals } from "../data";

export type Ctx = { api: (role: Role) => Promise<ApiSession>; data: DataGen };

/** Subconjunto del Encounter de la API que usan las fábricas. */
export type ApiEncounter = {
  encounterId: string;
  orderNumber: string;
  transferOrderNumber: string | null;
  patientName: string;
  documentNumber: string;
  currentStep: string;
  nextRole: Role | null;
  location: { room: string | null; bed: string | null; service: string | null };
  wristbandCode: string | null;
  recordId: string | null;
};

export type Enc = {
  encounterId: string;
  orderNumber: string;
  patient: Patient;
  currentStep: string;
  wristband?: string;
  transferOrderNumber?: string | null;
  room?: string | null;
  bed?: string | null;
  bedId?: number;
  baselineVitals?: Vitals;
};

export type Hosp = Enc & { currentStep: "cerrado" };

const CONSCIOUSNESS = { A: "alert", C: "confusion", V: "voice", P: "pain", U: "unresponsive" } as const;

/** Constantes en el formato de la API (admisión, atención y reevaluación de alertas). */
export function vitalsBody(v: Vitals) {
  return {
    respiratoryRate: v.respiratoryRate,
    oxygenSaturation: v.spo2,
    systolicBloodPressure: v.systolic,
    diastolicBloodPressure: v.diastolic,
    pulse: v.pulse,
    temperature: v.temperature,
    spo2Scale: v.spo2Scale === 1 ? "scale1" : "scale2",
    supplementalOxygen: v.supplementalO2,
    consciousness: CONSCIOUSNESS[v.consciousness],
    confusionOnset: "new",
  };
}
