import type { Role } from "../../../src/app/roles";
import type { Ctx, Enc } from "./types";

// RNF-18: módulo 4 (alta y egreso) por API, en el orden de la guía E4.
const DIS = "/discharge/encounters";

export const DISCHARGE_STEPS = [
  "orden",
  "epicrisis",
  "recetas",
  "social",
  "conciliacion",
  "informe",
  "recepcion",
  "cuenta",
  "pase",
  "salida",
] as const;
export type DischargeStep = (typeof DISCHARGE_STEPS)[number];
export type LifeMode = "usuario" | "invitacion" | "rechaza";

export type DischargeCase = {
  encounterId: string;
  nextAction: string;
  deliverables: { id: string; label: string; done: boolean }[];
  lifePlan: { mode: string; code?: string | null } | null;
};

export async function dischargeCase(ctx: Ctx, enc: Enc, role: Role = "medico_tratante"): Promise<DischargeCase> {
  return (await (await ctx.api(role)).get<{ case: DischargeCase }>(`${DIS}/${enc.encounterId}`)).case;
}

/** Deja hechos todos los pasos hasta `until` incluido. Devuelve el plan Life si se generó. */
export async function advanceDischarge(
  ctx: Ctx,
  enc: Enc,
  until: DischargeStep,
  opts: { lifeMode?: LifeMode } = {},
): Promise<{ lifePlan?: Record<string, unknown> }> {
  const url = `${DIS}/${enc.encounterId}`;
  const at = (role: Role) => ctx.api(role);
  let lifePlan: Record<string, unknown> | undefined;
  const steps: Record<DischargeStep, () => Promise<unknown>> = {
    orden: async () => (await at("medico_tratante")).post(`${url}/order`),
    epicrisis: async () =>
      (await at("medico_residente")).post(`${url}/epicrisis`, {
        diagnoses: `${enc.patient.reason} resuelta`,
        procedures: "Ninguno",
        evolution: "Favorable, afebril 48 h.",
      }),
    recetas: async () =>
      (await at("medico_residente")).post(`${url}/prescriptions`, {
        items: [{ drug: "Amoxicilina", dose: "500 mg", route: "Oral", frequency: "cada 8 horas", days: 7 }],
      }),
    social: async () =>
      (await at("trabajo_social")).post(`${url}/social-assessment`, {
        report: "Red de apoyo familiar adecuada; domicilio con servicios básicos.",
        validated: true,
      }),
    conciliacion: async () =>
      (await at("enfermera_piso")).post(`${url}/reconciliation`, { notes: "Se concilian medicamentos domiciliarios con la receta." }),
    informe: async () => {
      const nurse = await at("enfermera_piso");
      await nurse.post(`${url}/nursing-report`, {
        instructions: "Amoxicilina cada 8 horas por 7 días",
        alarmSigns: "Fiebre mayor a 38 C",
        homeCare: "Reposo relativo",
      });
      // El plan Life exige el informe ya generado.
      lifePlan = await nurse.post<Record<string, unknown>>(`${url}/life-plan`, { mode: opts.lifeMode ?? "rechaza" });
    },
    recepcion: async () => (await at("enfermera_piso")).post(`${url}/indication-receipt`, { receivedByName: enc.patient.relative.name }),
    cuenta: async () => (await at("altas_caja")).post(`${url}/account`, { status: "conforme" }),
    pase: async () => (await at("altas_caja")).post(`${url}/exit-pass`),
    salida: async () => (await at("enfermera_piso")).post(`${url}/exit`),
  };
  for (const step of DISCHARGE_STEPS.slice(0, DISCHARGE_STEPS.indexOf(until) + 1)) await steps[step]();
  return { lifePlan };
}
