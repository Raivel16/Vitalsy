import { describe, expect, it } from "vitest";
import { calculateNews2 } from "./news2";

const baseline = {
  respiratoryRate: 16,
  oxygenSaturation: 98,
  spo2Scale: "scale1" as const,
  supplementalOxygen: false,
  systolicBloodPressure: 120,
  pulse: 72,
  consciousness: "alert" as const,
  temperature: 36.8,
};

describe("calculateNews2", () => {
  it("scores a stable patient as 0, low risk and green", () => {
    const result = calculateNews2(baseline);

    expect(result.total).toBe(0);
    expect(result.band).toBe("low");
    expect(result.visual).toBe("green");
    expect(result.singleParameterAlert).toBe(false);
    expect(result.monitoring).toMatch(/12 horas/i);
    expect(result.parameters.every((item) => item.score === 0)).toBe(true);
  });

  it("uses the official respiration thresholds", () => {
    expect(calculateNews2({ ...baseline, respiratoryRate: 8 }).parameters[0]).toMatchObject({ score: 3 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 9 }).parameters[0]).toMatchObject({ score: 1 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 11 }).parameters[0]).toMatchObject({ score: 1 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 12 }).parameters[0]).toMatchObject({ score: 0 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 20 }).parameters[0]).toMatchObject({ score: 0 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 21 }).parameters[0]).toMatchObject({ score: 2 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 24 }).parameters[0]).toMatchObject({ score: 2 });
    expect(calculateNews2({ ...baseline, respiratoryRate: 25 }).parameters[0]).toMatchObject({ score: 3 });
  });

  it("uses SpO2 scale 1 unless scale 2 was explicitly selected", () => {
    expect(calculateNews2({ ...baseline, oxygenSaturation: 91 }).parameters.find((item) => item.id === "spo2")).toMatchObject({ score: 3 });
    expect(calculateNews2({ ...baseline, oxygenSaturation: 92 }).parameters.find((item) => item.id === "spo2")).toMatchObject({ score: 2 });
    expect(calculateNews2({ ...baseline, oxygenSaturation: 94 }).parameters.find((item) => item.id === "spo2")).toMatchObject({ score: 1 });
    expect(calculateNews2({ ...baseline, oxygenSaturation: 96 }).parameters.find((item) => item.id === "spo2")).toMatchObject({ score: 0 });
  });

  it("scores scale 2 by air or oxygen, including 88-92 as zero", () => {
    const onOxygen = calculateNews2({
      ...baseline,
      spo2Scale: "scale2",
      supplementalOxygen: true,
      oxygenSaturation: 97,
    });
    expect(onOxygen.parameters.find((item) => item.id === "spo2")?.score).toBe(3);
    expect(onOxygen.parameters.find((item) => item.id === "oxygen")?.score).toBe(2);

    const onAir = calculateNews2({
      ...baseline,
      spo2Scale: "scale2",
      supplementalOxygen: false,
      oxygenSaturation: 97,
    });
    expect(onAir.parameters.find((item) => item.id === "spo2")?.score).toBe(0);

    const target = calculateNews2({
      ...baseline,
      spo2Scale: "scale2",
      supplementalOxygen: true,
      oxygenSaturation: 90,
    });
    expect(target.parameters.find((item) => item.id === "spo2")?.score).toBe(0);
  });

  it("uses the official blood pressure, pulse and temperature thresholds", () => {
    expect(calculateNews2({ ...baseline, systolicBloodPressure: 90 }).parameters.find((item) => item.id === "systolic")?.score).toBe(3);
    expect(calculateNews2({ ...baseline, systolicBloodPressure: 91 }).parameters.find((item) => item.id === "systolic")?.score).toBe(2);
    expect(calculateNews2({ ...baseline, systolicBloodPressure: 101 }).parameters.find((item) => item.id === "systolic")?.score).toBe(1);
    expect(calculateNews2({ ...baseline, systolicBloodPressure: 111 }).parameters.find((item) => item.id === "systolic")?.score).toBe(0);
    expect(calculateNews2({ ...baseline, systolicBloodPressure: 219 }).parameters.find((item) => item.id === "systolic")?.score).toBe(0);
    expect(calculateNews2({ ...baseline, systolicBloodPressure: 220 }).parameters.find((item) => item.id === "systolic")?.score).toBe(3);

    expect(calculateNews2({ ...baseline, pulse: 40 }).parameters.find((item) => item.id === "pulse")?.score).toBe(3);
    expect(calculateNews2({ ...baseline, pulse: 41 }).parameters.find((item) => item.id === "pulse")?.score).toBe(1);
    expect(calculateNews2({ ...baseline, pulse: 51 }).parameters.find((item) => item.id === "pulse")?.score).toBe(0);
    expect(calculateNews2({ ...baseline, pulse: 91 }).parameters.find((item) => item.id === "pulse")?.score).toBe(1);
    expect(calculateNews2({ ...baseline, pulse: 111 }).parameters.find((item) => item.id === "pulse")?.score).toBe(2);
    expect(calculateNews2({ ...baseline, pulse: 131 }).parameters.find((item) => item.id === "pulse")?.score).toBe(3);

    expect(calculateNews2({ ...baseline, temperature: 35 }).parameters.find((item) => item.id === "temperature")?.score).toBe(3);
    expect(calculateNews2({ ...baseline, temperature: 35.1 }).parameters.find((item) => item.id === "temperature")?.score).toBe(1);
    expect(calculateNews2({ ...baseline, temperature: 36.1 }).parameters.find((item) => item.id === "temperature")?.score).toBe(0);
    expect(calculateNews2({ ...baseline, temperature: 38.1 }).parameters.find((item) => item.id === "temperature")?.score).toBe(1);
    expect(calculateNews2({ ...baseline, temperature: 39.1 }).parameters.find((item) => item.id === "temperature")?.score).toBe(2);
  });

  it("scores new confusion and CVPU as 3, but not chronic confusion", () => {
    expect(calculateNews2({ ...baseline, consciousness: "confusion", confusionOnset: "new" }).parameters.find((item) => item.id === "consciousness")?.score).toBe(3);
    expect(calculateNews2({ ...baseline, consciousness: "confusion", confusionOnset: "chronic" }).parameters.find((item) => item.id === "consciousness")?.score).toBe(0);
    expect(calculateNews2({ ...baseline, consciousness: "voice" }).parameters.find((item) => item.id === "consciousness")?.score).toBe(3);
    expect(calculateNews2({ ...baseline, consciousness: "pain" }).parameters.find((item) => item.id === "consciousness")?.score).toBe(3);
    expect(calculateNews2({ ...baseline, consciousness: "unresponsive" }).parameters.find((item) => item.id === "consciousness")?.score).toBe(3);
  });

  it("adds 2 points when the patient is on supplemental oxygen", () => {
    const result = calculateNews2({ ...baseline, supplementalOxygen: true });
    expect(result.parameters.find((item) => item.id === "oxygen")?.score).toBe(2);
    expect(result.total).toBe(2);
    expect(result.band).toBe("low-medium");
    expect(result.visual).toBe("yellow");
  });

  it("marks a single parameter of 3 as urgent even when the aggregate is low-medium", () => {
    const result = calculateNews2({ ...baseline, respiratoryRate: 25 });
    expect(result.total).toBe(3);
    expect(result.band).toBe("low-medium");
    expect(result.visual).toBe("yellow");
    expect(result.singleParameterAlert).toBe(true);
    expect(result.clinicalResponse).toMatch(/urgente/i);
    expect(result.monitoring).toMatch(/1 hora/i);
  });

  it("classifies aggregate 5-6 as medium yellow and 7 or more as high red", () => {
    const medium = calculateNews2({
      ...baseline,
      supplementalOxygen: true,
      pulse: 120,
      temperature: 38.5,
    });
    expect(medium.total).toBe(5);
    expect(medium.band).toBe("medium");
    expect(medium.visual).toBe("yellow");

    const high = calculateNews2({
      ...baseline,
      respiratoryRate: 26,
      oxygenSaturation: 90,
      supplementalOxygen: true,
      pulse: 132,
    });
    expect(high.total).toBeGreaterThanOrEqual(7);
    expect(high.band).toBe("high");
    expect(high.visual).toBe("red");
    expect(high.monitoring).toMatch(/continuo/i);
  });
});
