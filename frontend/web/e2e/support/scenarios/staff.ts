import type { Role } from "../../../src/app/roles";
import type { Ctx } from "./types";

// RNF-18: módulo 6 (personal) por API. Las rutas comparten estado global (mes publicado,
// asignación por fecha): solo se usan desde pruebas del proyecto serial.
const STAFF = "/staff";

export type Member = { id: number; name: string; email?: string; role: Role; isActive: boolean };

export async function members(ctx: Ctx, role?: Role): Promise<Member[]> {
  const query = role ? `?role=${role}` : "";
  return (await (await ctx.api("enfermera_supervisora")).get<{ data: Member[] }>(`${STAFF}/members${query}`)).data;
}

export async function memberId(ctx: Ctx, email: string): Promise<number> {
  const found = (await members(ctx)).find((m) => m.email === email);
  if (!found) throw new Error(`No existe el colaborador ${email}`);
  return found.id;
}

export type ShiftInput = { email: string; startsAt: Date; endsAt: Date; unit: string };

/** RF-78: publica (reemplaza) el rol del mes `yearMonth` (AAAA-MM). */
export async function publishPlan(ctx: Ctx, yearMonth: string, shifts: ShiftInput[]): Promise<unknown> {
  const ids = await Promise.all(shifts.map((s) => memberId(ctx, s.email)));
  return (await ctx.api("jefatura_enfermeria")).post(`${STAFF}/shift-plans`, {
    yearMonth,
    shifts: shifts.map((s, i) => ({ userId: ids[i], startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), unit: s.unit })),
  });
}

export type Suggestion = {
  shiftDate: string;
  assignments: { nurseUserId: number; encounterId: string; patientName: string; news2Weight: number }[];
};

export async function suggestAssignments(ctx: Ctx, shiftDate: string, nurseEmails: string[]): Promise<Suggestion> {
  const nurseIds = await Promise.all(nurseEmails.map((e) => memberId(ctx, e)));
  return (await (await ctx.api("enfermera_supervisora")).post<{ suggestion: Suggestion }>(`${STAFF}/assignments/suggest`, { shiftDate, nurseIds }))
    .suggestion;
}

export type AssignmentInput = { nurseUserId: number; encounterId: string; news2Weight?: number };

/** RF-80: reemplaza la asignación del día `shiftDate` por la indicada. */
export async function approveAssignments(ctx: Ctx, shiftDate: string, assignments: AssignmentInput[]): Promise<unknown> {
  return (await ctx.api("enfermera_supervisora")).post(`${STAFF}/assignments/approve`, { shiftDate, assignments });
}

export type AbsenceResult = {
  absence: { id: number };
  coverage: { required: boolean; requestId: number | null };
  reassignments: { encounterId?: string; toUserId?: number; nurseUserId?: number }[];
  unassigned: number;
};

export async function registerAbsence(ctx: Ctx, email: string, shiftDate: string, reason: string): Promise<AbsenceResult> {
  const userId = await memberId(ctx, email);
  return (await ctx.api("enfermera_supervisora")).post<AbsenceResult>(`${STAFF}/absences`, { userId, shiftDate, reason });
}

export type CoverageRequest = { id: number; status: string } & Record<string, unknown>;

export async function coverageRequests(ctx: Ctx): Promise<CoverageRequest[]> {
  return (await (await ctx.api("enfermera_supervisora")).get<{ requests: CoverageRequest[] }>(`${STAFF}/coverage-requests`)).requests;
}

/** RF-86–88: solicitada → aprobada_jefatura → autorizada → confirmada. */
export async function driveCoverage(ctx: Ctx, id: number, until: "aprobada_jefatura" | "autorizada" | "confirmada", retainerEmail?: string): Promise<void> {
  await (await ctx.api("jefatura_enfermeria")).post(`${STAFF}/coverage-requests/${id}/approve`);
  if (until === "aprobada_jefatura") return;
  await (await ctx.api("recursos_humanos")).post(`${STAFF}/coverage-requests/${id}/authorize`);
  if (until === "autorizada") return;
  if (!retainerEmail) throw new Error("Indique el retén para confirmar su ingreso.");
  await (await ctx.api("enfermera_supervisora")).post(`${STAFF}/coverage-requests/${id}/confirm`, { userId: await memberId(ctx, retainerEmail) });
}
