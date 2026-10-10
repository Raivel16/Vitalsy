import { api } from "../../app/api";
import type {
  AbsenceResult,
  CoverageRequest,
  HandoverSummary,
  NurseLoad,
  PlanSummary,
  PublishedPlan,
  ProposedAssignment,
  StaffMember,
} from "./types";

const BASE = "/api/v1/staff";

export async function listMembers(): Promise<StaffMember[]> {
  const data = await api<{ data: StaffMember[] }>(`${BASE}/members`);
  return data.data;
}

/** Lanza si el mes no tiene rol publicado (404). */
export async function getPlan(yearMonth: string): Promise<PublishedPlan> {
  const data = await api<{ plan: PublishedPlan }>(`${BASE}/shift-plans/${yearMonth}`);
  return data.plan;
}

export async function listPlans(): Promise<PlanSummary[]> {
  const data = await api<{ plans: PlanSummary[] }>(`${BASE}/shift-plans`);
  return data.plans;
}

export function publishPlan(yearMonth: string, shifts: Array<{ userId: number; startsAt: string; endsAt: string; unit: string }>) {
  return api(`${BASE}/shift-plans`, { method: "POST", body: JSON.stringify({ yearMonth, shifts }) });
}

export async function suggestAssignments(shiftDate: string, nurseIds: number[]) {
  const data = await api<{ suggestion: { assignments: ProposedAssignment[]; loads: NurseLoad[] } }>(
    `${BASE}/assignments/suggest`,
    { method: "POST", body: JSON.stringify({ shiftDate, nurseIds }) },
  );
  return data.suggestion;
}

export function approveAssignments(shiftDate: string, assignments: ProposedAssignment[]) {
  return api(`${BASE}/assignments/approve`, {
    method: "POST",
    body: JSON.stringify({
      shiftDate,
      assignments: assignments.map(({ nurseUserId, encounterId, news2Weight }) => ({ nurseUserId, encounterId, news2Weight })),
    }),
  });
}

export function recordAbsence(userId: number, shiftDate: string, reason: string) {
  return api<AbsenceResult>(`${BASE}/absences`, {
    method: "POST",
    body: JSON.stringify({ userId, shiftDate, reason }),
  });
}

export async function listCoverage(): Promise<CoverageRequest[]> {
  const data = await api<{ requests: CoverageRequest[] }>(`${BASE}/coverage-requests`);
  return data.requests;
}

export function approveCoverage(id: number) {
  return api(`${BASE}/coverage-requests/${id}/approve`, { method: "POST" });
}

export function authorizeCoverage(id: number) {
  return api(`${BASE}/coverage-requests/${id}/authorize`, { method: "POST" });
}

export function confirmRetainer(id: number, userId: number) {
  return api(`${BASE}/coverage-requests/${id}/confirm`, { method: "POST", body: JSON.stringify({ userId }) });
}

export async function previewHandover(shiftDate: string, fromUserId: number): Promise<HandoverSummary> {
  const data = await api<{ handover: HandoverSummary }>(
    `${BASE}/handover?shiftDate=${encodeURIComponent(shiftDate)}&fromUserId=${fromUserId}`,
  );
  return data.handover;
}

export function signHandover(fromUserId: number, shiftDate: string) {
  return api(`${BASE}/handover`, { method: "POST", body: JSON.stringify({ fromUserId, shiftDate }) });
}
