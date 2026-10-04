import { describe, expect, it } from "vitest";
import { validateVitalSigns } from "./vitalSigns";

describe("validateVitalSigns", () => {
  it("accepts a physiologically plausible set", () => {
    expect(
      validateVitalSigns({
        respiratoryRate: "16",
        oxygenSaturation: "98",
        systolicBloodPressure: "120",
        diastolicBloodPressure: "80",
        pulse: "72",
        temperature: "36.8",
      }),
    ).toEqual({});
  });

  it("requires every measurement and rejects implausible values", () => {
    const errors = validateVitalSigns({
      respiratoryRate: "",
      oxygenSaturation: "40",
      systolicBloodPressure: "20",
      diastolicBloodPressure: "10",
      pulse: "10",
      temperature: "20",
    });

    expect(errors.respiratoryRate).toMatch(/obligatoria/i);
    expect(errors.oxygenSaturation).toMatch(/no es posible/i);
    expect(errors.systolicBloodPressure).toMatch(/no es posible/i);
    expect(errors.diastolicBloodPressure).toMatch(/no es posible/i);
    expect(errors.pulse).toMatch(/no es posible/i);
    expect(errors.temperature).toMatch(/no es posible/i);
  });
});
