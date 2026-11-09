import type { Role } from "../../../src/app/roles";
import { sequentially } from "../sequence";
import { recordVitals } from "./care";
import { vitalsBody, type Ctx, type Enc } from "./types";

// RNF-18: módulo 3 (alertas) por API, siguiendo el circuito de la guía E3.
const ALERTS = "/clinical-alerts";

export type Alert = {
  id: number;
  encounterId: string;
  patientName: string;
  source: string;
  severity: "media" | "alta";
  news2Total: number | null;
  status: string;
  assignedRole: string;
  needsSiren: boolean;
};

export async function inbox(ctx: Ctx, role: Role): Promise<Alert[]> {
  return (await (await ctx.api(role)).get<{ alerts: Alert[] }>(`${ALERTS}/inbox`)).alerts;
}

export async function alertOf(ctx: Ctx, enc: Enc, role: Role = "enfermera_piso"): Promise<Alert | undefined> {
  return (await inbox(ctx, role)).filter((a) => a.encounterId === enc.encounterId).sort((a, b) => b.id - a.id)[0];
}

export async function raiseAlert(ctx: Ctx, enc: Enc, profile: "news2_medio" | "news2_alto"): Promise<Alert> {
  const reading = await recordVitals(ctx, enc, ctx.data.vitals(profile));
  if (!reading.alertActivated) throw new Error(`NEWS2 ${reading.news2} no activó alerta para ${enc.encounterId}`);
  const alert = await alertOf(ctx, enc);
  if (!alert) throw new Error(`La alerta de ${enc.encounterId} no aparece en el inbox de enfermera_piso`);
  return ctx.data.track(`alerta ${alert.id}`, alert);
}

export const ALERT_STAGES = ["confirmada", "medico", "err", "orden_uci", "uci_autorizada", "en_uci"] as const;
export type AlertStage = (typeof ALERT_STAGES)[number];

/**
 * Lleva la alerta por el circuito E3-03…E3-10 hasta `until` (incluido). `from` omite las
 * etapas previas cuando la prueba ya las hizo por pantalla.
 */
export async function driveAlert(ctx: Ctx, alert: Alert, until: AlertStage, opts: { from?: AlertStage } = {}): Promise<void> {
  const stop = ALERT_STAGES.indexOf(until);
  const first = opts.from ? ALERT_STAGES.indexOf(opts.from) : 0;
  const at = (role: Role) => ctx.api(role);
  const url = `${ALERTS}/${alert.id}`;
  const steps: (() => Promise<unknown>)[] = [
    async () => (await at("enfermera_piso")).post(`${url}/acknowledge`),
    async () => {
      await (await at("enfermera_piso")).post(`${url}/reassessment`, vitalsBody(ctx.data.vitals("news2_alto")));
      await (await at("medico_residente")).post(`${url}/acknowledge`);
    },
    async () => (await at("medico_residente")).post(`${url}/rapid-response-request`, { reason: "Persiste hipotensión e hipoxemia a pesar de O2." }),
    async () => {
      await (await at("equipo_respuesta_rapida")).post(`${url}/acknowledge`);
      await (await at("equipo_respuesta_rapida")).post(`${url}/err-assessment`, { assessment: "Paciente crítico, requiere soporte avanzado.", transferToIcu: true });
    },
    async () => {
      await (await at("medico_residente")).post(`${url}/icu-authorize`);
      await (await at("enfermera_piso")).post(`${url}/icu-authorize`);
    },
    async () => (await at("enfermera_piso")).post(`${url}/icu-transfer`, { service: "UCI", room: "UCI-1", bed: "01" }),
  ];
  await sequentially(steps.slice(first, stop + 1), (step) => step());
}
