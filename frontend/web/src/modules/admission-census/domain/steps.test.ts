import { describe, expect, it } from "vitest";
import { canActOnEncounter } from "./steps";

describe("canActOnEncounter", () => {
  it("permite al médico tratante firmar indicaciones basales", () => {
    expect(canActOnEncounter("medico_tratante", {
      currentStep: "indicaciones",
      nextRole: "medico_residente",
    })).toBe(true);
  });

  it("no permite al tratante actuar en otros pasos de enfermería", () => {
    expect(canActOnEncounter("medico_tratante", {
      currentStep: "kardex",
      nextRole: "enfermera_piso",
    })).toBe(false);
  });
});
