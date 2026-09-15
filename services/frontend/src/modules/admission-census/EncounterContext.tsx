import { createContext, useContext } from "react";
import type { Encounter } from "./domain/encounter";

export type CoverageStatus = "aprobada" | "pendiente" | "rechazada";

export type EncounterState = {
  encounter: Encounter | null;
  coverageStatus: CoverageStatus | null;
  setCoverageStatus: (status: CoverageStatus) => void;
  applyEncounter: (encounter: Encounter) => void;
};

export const EncounterContext = createContext<EncounterState>({
  encounter: null,
  coverageStatus: null,
  setCoverageStatus: () => undefined,
  applyEncounter: () => undefined,
});

export function useEncounter(): Encounter | null {
  return useContext(EncounterContext).encounter;
}

export function useEncounterState(): EncounterState {
  return useContext(EncounterContext);
}
