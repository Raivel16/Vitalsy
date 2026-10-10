import { describe, expect, it } from "vitest";
import { cleanRiskLabel } from "./riskLabel";

describe("cleanRiskLabel", () => {
  it("muestra un guion cuando no hay texto", () => {
    expect(cleanRiskLabel(undefined)).toBe("—");
    expect(cleanRiskLabel(null)).toBe("—");
    expect(cleanRiskLabel("")).toBe("—");
  });

  it("deja intactas las etiquetas sin repetición", () => {
    expect(cleanRiskLabel("Riesgo alto de caídas")).toBe("Riesgo alto de caídas");
    expect(cleanRiskLabel("Riesgo moderado de úlceras por presión")).toBe("Riesgo moderado de úlceras por presión");
  });

  it("elimina la frase repetida de caídas y de úlceras", () => {
    expect(cleanRiskLabel("Riesgo de caídas de caídas")).toBe("Riesgo de caídas");
    expect(cleanRiskLabel("Alto de úlceras por presión de úlceras por presión")).toBe("Alto de úlceras por presión");
    expect(cleanRiskLabel("Morse de caída: de caída: alto")).toBe("Morse de caída: alto");
    expect(cleanRiskLabel("Braden de úlcera por presión: de úlcera por presión: medio")).toBe("Braden de úlcera por presión: medio");
  });

  it("resuelve rápido una racha larga de espacios sin repetición", () => {
    const input = `Riesgo${" ".repeat(60000)}x`;
    const started = performance.now();
    expect(cleanRiskLabel(input)).toBe(input);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
