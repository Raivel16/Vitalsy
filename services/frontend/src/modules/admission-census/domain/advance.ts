import { api } from "../../../app/api";
import type { Role } from "../../../app/roles";
import type { CoverageStatus } from "../EncounterContext";
import type { Encounter } from "./encounter";
import { stepPath } from "./steps";

export async function advanceEncounter(
  encounterId: string,
  step: string,
  coverageStatus?: CoverageStatus,
): Promise<Encounter> {
  const body: { step: string; coverageStatus?: CoverageStatus } = { step };
  if (coverageStatus) body.coverageStatus = coverageStatus;
  const data = await api<{ encounter: Encounter }>(
    `/api/v1/hospital-admission/encounters/${encodeURIComponent(encounterId)}/advance`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return data.encounter;
}

export function pathAfterAdvance(encounter: Encounter, role: Role): string {
  if (!encounter.nextRole) {
    return `/pacientes/${encounter.encounterId}`;
  }
  if (encounter.nextRole !== role) {
    return `/pacientes/${encounter.encounterId}`;
  }
  return stepPath(encounter.currentStep, encounter.encounterId);
}
