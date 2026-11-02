import type { Vitals } from "../data";
import { vitalsBody, type Ctx, type Enc } from "./types";

// RNF-18: módulo 2 (CPOE, constantes, e-MAR) por API.
const CARE = "/inpatient-care/encounters";

export type Prescription = { drug: string; dose: string; route: string; frequency: string };

export async function prescribe(ctx: Ctx, enc: Enc, items: Prescription[]): Promise<{ codes: string[] }> {
  const { prescription } = await (await ctx.api("medico_tratante")).post<{ prescription: { items: { drugBarcode: string }[] } }>(
    `${CARE}/${enc.encounterId}/prescriptions`,
    { items: items.map((i) => ({ drugName: i.drug, dose: i.dose, route: i.route, frequency: i.frequency, firstDoseAt: new Date().toISOString() })) },
  );
  return ctx.data.track(`CPOE ${enc.encounterId}`, { codes: prescription.items.map((i) => i.drugBarcode) });
}

export type ReadingResult = { news2: number; alertActivated: boolean; nextControlAt: string | null };

export async function recordVitals(
  ctx: Ctx,
  enc: Enc,
  v: Vitals,
  role: "enfermera_piso" | "auxiliar_enfermeria" = "enfermera_piso",
): Promise<ReadingResult> {
  const res = await (await ctx.api(role)).post<{ alertActivated: boolean; nextControlAt: string | null; reading: { news2: { total: number } } }>(
    `${CARE}/${enc.encounterId}/vital-signs`,
    vitalsBody(v),
  );
  return { news2: res.reading.news2.total, alertActivated: res.alertActivated, nextControlAt: res.nextControlAt };
}

export type Dose = {
  id: number;
  drugName: string;
  status: string;
  scheduledAt: string;
};

export async function emarDoses(ctx: Ctx, enc: Enc): Promise<Dose[]> {
  return (await (await ctx.api("enfermera_piso")).get<{ doses: Dose[] }>(`${CARE}/${enc.encounterId}/emar`)).doses;
}
