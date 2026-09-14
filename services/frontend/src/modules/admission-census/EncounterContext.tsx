import { createContext, useContext } from "react";
import type { Encounter } from "./domain/encounter";

export const EncounterContext = createContext<Encounter | null>(null);

export function useEncounter(): Encounter | null {
  return useContext(EncounterContext);
}
