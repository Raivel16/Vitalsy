import { request } from "@playwright/test";
import type { Role } from "../../../src/app/roles";
import { ApiError } from "../api";
import { news2, type Patient } from "../data";
import { E2E_BASE_URL } from "../env";
import { assignBed, requestBed } from "./beds";
import { vitalsBody, type ApiEncounter, type Ctx, type Enc, type Hosp } from "./types";

// RNF-18: lleva un ingreso por el stepper del módulo 1 con las mismas llamadas que hace
// cada pantalla (acción del paso + POST /encounters/{id}/advance).

export const ADMISSION_STEPS = [
  "orden",
  "filiacion",
  "cobertura",
  "brazalete",
  "expediente",
  "consentimiento",
  "traslado",
  "identidad",
  "recepcion",
  "valoracion",
  "constantes",
  "conciliacion",
  "escalas",
  "kardex",
  "indicaciones",
  "cerrado",
] as const;
export type AdmissionStep = (typeof ADMISSION_STEPS)[number];

const STEP_ROLE: Record<string, Role> = {
  orden: "admision",
  filiacion: "admision",
  cobertura: "admision",
  derivacion: "admision",
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

const ADM = "/hospital-admission";

function apply(enc: Enc, e: ApiEncounter): Enc {
  return {
    ...enc,
    currentStep: e.currentStep,
    wristband: e.wristbandCode ?? enc.wristband,
    transferOrderNumber: e.transferOrderNumber,
    room: e.location.room,
    bed: e.location.bed,
  };
}

async function advance(ctx: Ctx, enc: Enc, step: string, coverageStatus?: string): Promise<Enc> {
  const api = await ctx.api(STEP_ROLE[step]);
  const { encounter } = await api.post<{ encounter: ApiEncounter }>(`${ADM}/encounters/${enc.encounterId}/advance`, {
    step,
    ...(coverageStatus ? { coverageStatus } : {}),
  });
  return apply(enc, encounter);
}

export type AdmissionOptions = { withBed?: boolean; lifeCode?: string };

/** Acción de la pantalla del paso vigente; devuelve el ingreso ya avanzado. */
async function completeStep(ctx: Ctx, enc: Enc, opts: AdmissionOptions): Promise<Enc> {
  const id = enc.encounterId;
  const p = enc.patient;
  const as = (role: Role) => ctx.api(role);

  switch (enc.currentStep) {
    case "orden":
      await (await as("admision")).get(`${ADM}/admission-orders/${encodeURIComponent(enc.orderNumber)}`);
      return advance(ctx, enc, "orden");
    case "filiacion":
      await (await as("admision")).post(`${ADM}/filiation/validate`, {
        encounterId: id,
        fullName: p.fullName,
        documentNumber: p.dni,
        birthDate: p.birthDate,
        confirmed: true,
      });
      return advance(ctx, enc, "filiacion");
    case "cobertura": {
      const next = await advance(ctx, enc, "cobertura", p.coverage);
      if (p.coverage === "aprobada") return next;
      await (await as("admision")).post(`${ADM}/coverage/referrals`, {
        encounterId: id,
        destination: "trabajo_social",
        relativeName: p.relative.name,
        relativePhone: p.relative.phone,
      });
      return next;
    }
    case "derivacion":
      // Trámite resuelto: la cobertura pasa a aprobada y sigue el brazalete.
      return advance(ctx, { ...enc, patient: { ...p, coverage: "aprobada" } }, "derivacion", "aprobada");
    case "brazalete": {
      const { wristband } = await (await as("admision")).post<{ wristband: { code: string } }>(`${ADM}/wristbands`, { encounterId: id });
      return advance(ctx, { ...enc, wristband: wristband.code }, "brazalete");
    }
    case "expediente":
      await (await as("admision")).post(`${ADM}/clinical-records`, { encounterId: id });
      return advance(ctx, enc, "expediente");
    case "consentimiento": {
      let current = enc;
      if (opts.withBed && current.bedId === undefined) {
        const { requestId } = await requestBed(ctx, {
          encounterId: id,
          specialty: "medicina_interna",
          gender: p.sex,
          isolationType: "ninguno",
          priority: "media",
          source: "admisiones",
        });
        const bed = await assignBed(ctx, requestId);
        current = { ...current, bedId: bed.bedId, room: bed.room, bed: bed.bedCode };
      }
      await (await as("admision")).post(`${ADM}/informed-consents`, {
        encounterId: id,
        signerName: p.fullName,
        relationship: "titular",
        accepted: true,
        lifeUser: Boolean(opts.lifeCode),
      });
      if (opts.lifeCode) await (await as("admision")).post(`${ADM}/life-links`, { encounterId: id, code: opts.lifeCode });
      return advance(ctx, current, "consentimiento");
    }
    case "traslado":
      await (await as("camillero")).get(`${ADM}/transfer-orders/${encodeURIComponent(enc.transferOrderNumber ?? "")}`);
      return advance(ctx, enc, "traslado");
    case "identidad":
      await (await as("camillero")).post(`${ADM}/wristbands/verify`, { code: enc.wristband });
      return advance(ctx, enc, "identidad");
    case "recepcion":
      await (await as("enfermera_piso")).post(`${ADM}/floor-receptions`, {
        encounterId: id,
        room: enc.room,
        bed: enc.bed,
        confirmed: true,
      });
      return advance(ctx, enc, "recepcion");
    case "valoracion":
      await (await as("enfermera_piso")).post(`${ADM}/nursing-assessments`, {
        encounterId: id,
        chiefComplaint: p.reason,
        history: "Sin antecedentes relevantes",
        allergies: p.allergies,
      });
      return advance(ctx, enc, "valoracion");
    case "constantes": {
      const v = enc.baselineVitals ?? ctx.data.vitals("normal");
      await (await as("enfermera_piso")).post(`${ADM}/vital-signs`, { encounterId: id, ...vitalsBody(v), news2Total: news2(v) });
      return advance(ctx, { ...enc, baselineVitals: v }, "constantes");
    }
    case "conciliacion":
      await (await as("enfermera_piso")).post(`${ADM}/medication-reconciliations`, {
        encounterId: id,
        allergies: p.allergies.join(", "),
        medications: p.homeMeds,
        noHomeMedications: p.homeMeds.length === 0,
        status: "validada",
      });
      return advance(ctx, enc, "conciliacion");
    case "escalas":
      await (await as("enfermera_piso")).post(`${ADM}/risk-scales`, {
        encounterId: id,
        morse: {
          historyOfFalling: false,
          secondaryDiagnosis: false,
          ambulatoryAid: "none",
          intravenousAccess: false,
          gait: "normal",
          mentalStatus: "oriented",
        },
        braden: { sensoryPerception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, frictionShear: 3 },
      });
      return advance(ctx, enc, "escalas");
    case "kardex":
      await (await as("enfermera_piso")).get(`${ADM}/kardex/${id}`);
      return advance(ctx, enc, "kardex");
    case "indicaciones": {
      const items = [{ category: "Dieta", title: "Dieta", detail: "Dieta blanda hiposódica" }];
      const doctor = await as("medico_residente");
      await doctor.put(`${ADM}/medical-orders/${id}`, { items });
      await doctor.post(`${ADM}/medical-orders/${id}/sign`, {
        physicianName: "Andrés Castillo Ortiz",
        credential: "CMP 045678",
        confirmed: true,
        items,
      });
      return advance(ctx, enc, "indicaciones");
    }
    default:
      throw new Error(`Paso de admisión sin fábrica: ${enc.currentStep}`);
  }
}

export function encounterBody(patient: Patient, orderNumber: string) {
  return {
    orderNumber,
    patientName: patient.fullName,
    documentNumber: patient.dni,
    originService: patient.origin,
    coveragePayer: patient.payer,
    coverageStatus: patient.coverage,
    coveragePlan: patient.plan,
    reason: patient.reason,
    source: "manual",
  };
}

export async function registerEncounter(ctx: Ctx, patient: Patient = ctx.data.patient()): Promise<Enc> {
  const orderNumber = ctx.data.orderNumber();
  const api = await ctx.api("admision");
  // Dos registros simultáneos pueden recibir el mismo ENC-… y el segundo responde 500
  // (defecto cubierto por m1-admision/concurrencia.spec.ts). Aquí solo se reintenta para
  // que el resto de la suite pueda preparar sus pacientes.
  for (let attempt = 0; ; attempt++) {
    try {
      const { encounter } = await api.post<{ encounter: ApiEncounter }>(`${ADM}/encounters`, encounterBody(patient, orderNumber));
      return ctx.data.track(`ingreso ${encounter.encounterId}`, apply({ encounterId: encounter.encounterId, orderNumber, patient, currentStep: "" }, encounter));
    } catch (error) {
      if (attempt >= 5 || !(error instanceof ApiError) || error.status !== 500) throw error;
      await new Promise((r) => setTimeout(r, 150 + ctx.data.int(0, 350)));
    }
  }
}

/** Deja el ingreso EN el paso `until` (sin completarlo). `cerrado` = hospitalizado. */
export async function advanceAdmission(ctx: Ctx, enc: Enc, until: AdmissionStep, opts: AdmissionOptions = {}): Promise<Enc> {
  const target = ADMISSION_STEPS.indexOf(until);
  let current = enc;
  for (let guard = 0; guard < 25; guard++) {
    const at = ADMISSION_STEPS.indexOf(current.currentStep as AdmissionStep);
    if (current.currentStep === until || (at >= target && current.currentStep !== "derivacion")) return current;
    current = await completeStep(ctx, current, opts);
  }
  throw new Error(`El ingreso ${enc.encounterId} no llegó al paso ${until} (quedó en ${current.currentStep}).`);
}

export async function hospitalize(ctx: Ctx, opts: AdmissionOptions & { patient?: Patient } = {}): Promise<Hosp> {
  const enc = await registerEncounter(ctx, opts.patient);
  return (await advanceAdmission(ctx, enc, "cerrado", opts)) as Hosp;
}

/** Cuenta de Vitalsy Life con 10 días de frecuencia cardiaca y su código VL-… (guía §1.9). */
export async function lifeLinkCode(ctx: Ctx): Promise<{ code: string; email: string; token: string }> {
  const life = await request.newContext({ baseURL: `${E2E_BASE_URL}/api/v1/life/`, extraHTTPHeaders: { Accept: "application/json" } });
  try {
    const email = `life.${ctx.data.seed}.${ctx.data.int(1000, 9999)}@correo.pe`;
    const reg = await life.post("auth/register", { data: { name: ctx.data.patient().fullName, email, password: "Clave-segura-9" } });
    if (!reg.ok()) throw new Error(`Registro Life → ${reg.status()}: ${await reg.text()}`);
    const { token } = (await reg.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };
    await life.put("consent", { headers, data: { sharingEnabled: true } });
    const samples = Array.from({ length: 10 }, (_, i) => {
      const start = new Date(Date.now() - (i + 1) * 86_400_000);
      return {
        id: `hr-${i + 1}`,
        kind: "heart_rate",
        value: 60 + i,
        unit: "bpm",
        startedAt: start.toISOString(),
        endedAt: new Date(start.getTime() + 60_000).toISOString(),
        origin: "manual",
      };
    });
    const sync = await life.post("sync", { headers, data: { items: [{ id: "bio-1", kind: "biometrics", status: "pending", body: JSON.stringify(samples) }] } });
    if (!sync.ok()) throw new Error(`Sync Life → ${sync.status()}: ${await sync.text()}`);
    const linked = await life.post("link-codes", { headers });
    const { code } = (await linked.json()) as { code: string };
    return ctx.data.track("cuenta Life", { code, email, token });
  } finally {
    await life.dispose();
  }
}
