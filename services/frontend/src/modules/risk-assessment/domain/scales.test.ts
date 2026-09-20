import { describe, expect, it } from "vitest";
import { calculateBraden } from "./bradenScale";
import { calculateMorse } from "./morseFallScale";

const noFallRisk = {
  historyOfFalling: false,
  secondaryDiagnosis: false,
  ambulatoryAid: "none" as const,
  intravenousAccess: false,
  gait: "normal" as const,
  mentalStatus: "oriented" as const,
};

describe("calculateMorse", () => {
  it("scores each official item and caps the scale at 125", () => {
    expect(calculateMorse(noFallRisk)).toMatchObject({ total: 0, level: "low" });
    expect(
      calculateMorse({
        historyOfFalling: true,
        secondaryDiagnosis: true,
        ambulatoryAid: "furniture",
        intravenousAccess: true,
        gait: "impaired",
        mentalStatus: "overestimates",
      }),
    ).toMatchObject({ total: 125, level: "high" });
  });

  it("uses acute-care cutoffs: 0-24 low, 25-44 moderate, 45 or more high", () => {
    expect(calculateMorse({ ...noFallRisk, historyOfFalling: false }).level).toBe("low");
    expect(calculateMorse({ ...noFallRisk, historyOfFalling: true }).total).toBe(25);
    expect(calculateMorse({ ...noFallRisk, historyOfFalling: true }).level).toBe("moderate");
    expect(
      calculateMorse({
        ...noFallRisk,
        historyOfFalling: true,
        ambulatoryAid: "device",
        gait: "weak",
      }).total,
    ).toBe(50);
    expect(
      calculateMorse({
        ...noFallRisk,
        historyOfFalling: true,
        gait: "impaired",
      }),
    ).toMatchObject({ total: 45, level: "high" });
  });

  it("returns recommendations that do not rely only on a color name", () => {
    const high = calculateMorse({
      ...noFallRisk,
      historyOfFalling: true,
      gait: "impaired",
    });
    expect(high.levelLabel).toMatch(/alto/i);
    expect(high.recommendations.join(" ")).toMatch(/acompañ/i);
  });
});

describe("calculateBraden", () => {
  it("sums six subscales and treats a lower score as higher risk", () => {
    expect(
      calculateBraden({
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 3,
      }),
    ).toMatchObject({ total: 23, level: "none" });

    expect(
      calculateBraden({
        sensoryPerception: 1,
        moisture: 1,
        activity: 1,
        mobility: 1,
        nutrition: 1,
        frictionShear: 1,
      }),
    ).toMatchObject({ total: 6, level: "severe" });
  });

  it("uses Braden cutoffs 19-23, 15-18, 13-14, 10-12 and 9 or less", () => {
    expect(calculateBraden({ sensoryPerception: 3, moisture: 3, activity: 3, mobility: 3, nutrition: 3, frictionShear: 3 }).level).toBe("mild");
    expect(calculateBraden({ sensoryPerception: 3, moisture: 2, activity: 2, mobility: 2, nutrition: 2, frictionShear: 2 }).level).toBe("moderate");
    expect(calculateBraden({ sensoryPerception: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, frictionShear: 2 }).level).toBe("high");
    expect(calculateBraden({ sensoryPerception: 2, moisture: 2, activity: 1, mobility: 1, nutrition: 2, frictionShear: 1 }).level).toBe("severe");
  });

  it("rejects a friction score outside 1 to 3", () => {
    expect(() =>
      calculateBraden({
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 4 as unknown as 1,
      }),
    ).toThrow(/fricción/i);
  });

  it("names the risk level and gives a repositioning recommendation when risk is high", () => {
    const result = calculateBraden({
      sensoryPerception: 2,
      moisture: 2,
      activity: 2,
      mobility: 2,
      nutrition: 2,
      frictionShear: 2,
    });
    expect(result.levelLabel).toMatch(/alto/i);
    expect(result.recommendations.join(" ")).toMatch(/cambios posturales/i);
  });
});
