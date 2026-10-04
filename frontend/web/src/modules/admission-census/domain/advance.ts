import { api } from "../../../app/api";
import type { CoverageStatus } from "../EncounterContext";
import type { Encounter } from "./encounter";

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
