// Preparación de datos por API para los escenarios de Cypress del módulo 3: lleva un ingreso por el
// stepper del módulo 1 (acción del paso + POST /encounters/{id}/advance) hasta dejarlo hospitalizado.
import type { VitalsySession } from "./session";
import { VitalsyApiError } from "./session";
import { vitalsBody, type VitalsProfile } from "./vitals";

export type SessionFor = (role: string) => Promise<VitalsySession>;

export type Patient = { fullName: string; dni: string; birthDate: string };

export type Hospitalized = { encounterId: string; patientName: string; room: string | null; bed: string | null };

export type RaisedAlert = { id: number; encounterId: string; severity: string; news2Total: number | null; status: string };

type ApiEncounter = {
  encounterId: string;
  currentStep: string;
  wristbandCode: string | null;
  transferOrderNumber: string | null;
  location: { room: string | null; bed: string | null };
};

type Enc = { id: string; orderNumber: string; patient: Patient; step: string; wristband: string | null; transfer: string | null; room: string | null; bed: string | null };

const ADM = "/hospital-admission";
const MAX_STEPS = 25;
const GIVEN = ["Rosa", "Carmen", "Lucia", "Elena", "Julia", "Teresa", "Ana", "Sofia"];
const SURNAMES = ["Quispe", "Mamani", "Huaman", "Flores", "Rojas", "Condori", "Vargas", "Chavez"];

const STEP_ROLE: Record<string, string> = {
  orden: "admision",
  filiacion: "admision",
  cobertura: "admision",
  brazalete: "admision",
  expediente: "admision",
  consentimiento: "admision",
  traslado: "camillero",
  identidad: "camillero",
  recepcion: "enfermera_piso",
  valoracion: "enfermera_piso",
  constantes: "enfermera_piso",
  conciliacion: "enfermera_piso",
  escalas: "enfermera_piso",
  kardex: "enfermera_piso",
  indicaciones: "medico_residente",
};

/** Paciente único por corrida: nombre solo con letras y DNI de 8 dígitos derivados de la semilla. */
export function patientFor(seed: number): Patient {
  const n = Math.abs(Math.trunc(seed));
  const given = GIVEN[n % GIVEN.length];
  const first = SURNAMES[Math.floor(n / GIVEN.length) % SURNAMES.length];
  const second = SURNAMES[Math.floor(n / 7) % SURNAMES.length];
  return { fullName: `${given} ${first} ${second}`, dni: String(10_000_000 + (n % 90_000_000)), birthDate: "1958-04-12" };
}

function toEnc(enc: Enc, api: ApiEncounter): Enc {
  return {
    ...enc,
    step: api.currentStep,
    wristband: api.wristbandCode ?? enc.wristband,
    transfer: api.transferOrderNumber ?? enc.transfer,
    room: api.location.room ?? enc.room,
    bed: api.location.bed ?? enc.bed,
  };
}

async function advance(as: SessionFor, enc: Enc, step: string, extra: Record<string, string> = {}): Promise<Enc> {
  const api = await as(STEP_ROLE[step]);
  const { encounter } = await api.request<{ encounter: ApiEncounter }>("POST", `${ADM}/encounters/${enc.id}/advance`, { step, ...extra });
  return toEnc(enc, encounter);
}

/**
 * Perfiles de cama que se prueban en orden: la política de género de cada habitación limita las sugerencias.
 * Como último recurso se pide aislamiento de contacto, que habilita las camas de aislamiento libres.
 */
export const BED_PROFILES = [
  { specialty: "medicina_interna", gender: "female", isolationType: "ninguno" },
  { specialty: "medicina_interna", gender: "male", isolationType: "ninguno" },
  { specialty: "cirugia", gender: "female", isolationType: "ninguno" },
  { specialty: "cirugia", gender: "male", isolationType: "ninguno" },
  { specialty: "medicina_interna", gender: "female", isolationType: "contacto" },
  { specialty: "cirugia", gender: "female", isolationType: "contacto" },
] as const;

type Suggestion = { id: number; room: string; bedCode: string };

async function tryAssign(beds: VitalsySession, requestId: number, suggestions: Suggestion[]): Promise<Suggestion | null> {
  for (const bed of suggestions) {
    try {
      await beds.request("POST", `/beds/requests/${requestId}/assign`, { bedId: bed.id });
      return bed;
    } catch (error) {
      if (!(error instanceof VitalsyApiError) || error.status !== 422) throw error;
    }
  }
  return null;
}

async function assignBed(as: SessionFor, encounterId: string): Promise<Suggestion> {
  const beds = await as("gestion_camas");
  for (const profile of BED_PROFILES) {
    const { request, suggestions } = await beds.request<{ request: { id: number }; suggestions: Suggestion[] }>("POST", "/beds/requests", {
      encounterId, ...profile, isolation: profile.isolationType !== "ninguno", priority: "media", source: "admisiones",
    });
    const bed = await tryAssign(beds, request.id, suggestions);
    if (bed) return bed;
  }
  throw new Error(`No hay camas disponibles para ${encounterId}: libere camas antes de ejecutar Cypress.`);
}

/** Acción de la pantalla del paso vigente; devuelve el ingreso ya avanzado. */
async function completeStep(as: SessionFor, enc: Enc): Promise<Enc> {
  const id = enc.id;
  const actions: Record<string, () => Promise<unknown>> = {
    orden: async () => (await as("admision")).request("GET", `${ADM}/admission-orders/${encodeURIComponent(enc.orderNumber)}`),
    filiacion: async () => (await as("admision")).request("POST", `${ADM}/filiation/validate`, {
      encounterId: id, fullName: enc.patient.fullName, documentNumber: enc.patient.dni, birthDate: enc.patient.birthDate, confirmed: true,
    }),
    brazalete: async () => {
      const { wristband } = await (await as("admision")).request<{ wristband: { code: string } }>("POST", `${ADM}/wristbands`, { encounterId: id });
      enc = { ...enc, wristband: wristband.code };
    },
    expediente: async () => (await as("admision")).request("POST", `${ADM}/clinical-records`, { encounterId: id }),
    consentimiento: async () => (await as("admision")).request("POST", `${ADM}/informed-consents`, {
      encounterId: id, signerName: enc.patient.fullName, relationship: "titular", accepted: true, lifeUser: false,
    }),
    traslado: async () => (await as("camillero")).request("GET", `${ADM}/transfer-orders/${encodeURIComponent(enc.transfer ?? "")}`),
    identidad: async () => (await as("camillero")).request("POST", `${ADM}/wristbands/verify`, { code: enc.wristband }),
    recepcion: async () => (await as("enfermera_piso")).request("POST", `${ADM}/floor-receptions`, { encounterId: id, room: enc.room, bed: enc.bed, confirmed: true }),
    valoracion: async () => (await as("enfermera_piso")).request("POST", `${ADM}/nursing-assessments`, {
      encounterId: id, chiefComplaint: "Neumonía adquirida en la comunidad", history: "Sin antecedentes relevantes", allergies: [],
    }),
    constantes: async () => (await as("enfermera_piso")).request("POST", `${ADM}/vital-signs`, { encounterId: id, ...vitalsBody("normal"), news2Total: 0 }),
    conciliacion: async () => (await as("enfermera_piso")).request("POST", `${ADM}/medication-reconciliations`, {
      encounterId: id, allergies: "", medications: [], noHomeMedications: true, status: "validada",
    }),
    escalas: async () => (await as("enfermera_piso")).request("POST", `${ADM}/risk-scales`, {
      encounterId: id,
      morse: { historyOfFalling: false, secondaryDiagnosis: false, ambulatoryAid: "none", intravenousAccess: false, gait: "normal", mentalStatus: "oriented" },
      braden: { sensoryPerception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, frictionShear: 3 },
    }),
    kardex: async () => (await as("enfermera_piso")).request("GET", `${ADM}/kardex/${id}`),
    indicaciones: async () => {
      const items = [{ category: "Dieta", title: "Dieta", detail: "Dieta blanda hiposódica" }];
      const doctor = await as("medico_residente");
      await doctor.request("PUT", `${ADM}/medical-orders/${id}`, { items });
      await doctor.request("POST", `${ADM}/medical-orders/${id}/sign`, { physicianName: "Andrés Castillo Ortiz", credential: "CMP 045678", confirmed: true, items });
    },
  };

  const step = enc.step;
  if (step === "cobertura") return advance(as, enc, step, { coverageStatus: "aprobada" });
  const action = actions[step];
  if (!action) throw new Error(`Paso de admisión sin preparación: ${step}`);
  await action();
  const next = await advance(as, enc, step);
  if (step !== "expediente") return next;
  // El consentimiento exige una cama del censo.
  const bed = await assignBed(as, id);
  return { ...next, room: bed.room, bed: bed.bedCode };
}

export async function hospitalize(as: SessionFor, seed: number): Promise<Hospitalized> {
  const patient = patientFor(seed);
  const orderNumber = `OI-CY-${seed.toString(36)}`;
  const { encounter } = await (await as("admision")).request<{ encounter: ApiEncounter }>("POST", `${ADM}/encounters`, {
    orderNumber,
    patientName: patient.fullName,
    documentNumber: patient.dni,
    originService: "Emergencia adultos",
    coveragePayer: "EsSalud",
    coverageStatus: "aprobada",
    coveragePlan: "Regular",
    reason: "Neumonía adquirida en la comunidad",
    source: "manual",
  });
  let enc = toEnc({ id: encounter.encounterId, orderNumber, patient, step: "", wristband: null, transfer: null, room: null, bed: null }, encounter);
  for (let guard = 0; enc.step !== "cerrado"; guard++) {
    if (guard >= MAX_STEPS) throw new Error(`El ingreso ${enc.id} quedó en el paso ${enc.step}.`);
    enc = await completeStep(as, enc);
  }
  return { encounterId: enc.id, patientName: patient.fullName, room: enc.room, bed: enc.bed };
}

/** RF-39: registra constantes con NEWS2 ≥ 1 y devuelve la alerta que llega a la bandeja de enfermería. */
export async function raiseAlert(as: SessionFor, encounterId: string, profile: Exclude<VitalsProfile, "normal">): Promise<RaisedAlert> {
  const nurse = await as("enfermera_piso");
  const reading = await nurse.request<{ alertActivated: boolean }>("POST", `/inpatient-care/encounters/${encounterId}/vital-signs`, vitalsBody(profile));
  if (!reading.alertActivated) throw new Error(`Las constantes ${profile} no activaron alerta en ${encounterId}.`);
  const { alerts } = await nurse.request<{ alerts: RaisedAlert[] }>("GET", "/clinical-alerts/inbox");
  const alert = alerts.filter((item) => item.encounterId === encounterId).sort((a, b) => b.id - a.id)[0];
  if (!alert) throw new Error(`La alerta de ${encounterId} no llegó a la bandeja de enfermería.`);
  return alert;
}
