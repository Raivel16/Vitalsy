import { canReadLifeBaseline, lifeKindLabel, lifeLinkErrorMessage, lifeMetricRange } from "./lifeBaseline";

describe("línea de base de Vitalsy Life", () => {
  it("traduce cada tipo de métrica y conserva los desconocidos", () => {
    expect(lifeKindLabel("heart_rate")).toBe("Pulso");
    expect(lifeKindLabel("resting_heart_rate")).toBe("Pulso en reposo");
    expect(lifeKindLabel("hrv")).toBe("Variabilidad cardíaca");
    expect(lifeKindLabel("spo2")).toBe("SpO₂");
    expect(lifeKindLabel("skin_temperature")).toBe("Temperatura cutánea");
    expect(lifeKindLabel("body_temperature")).toBe("Temperatura corporal");
    expect(lifeKindLabel("otro")).toBe("otro");
  });

  it("formatea el rango personal con su unidad", () => {
    expect(lifeMetricRange({ kind: "heart_rate", low: 58, high: 92, days: 14 })).toBe("58–92 lpm");
    expect(lifeMetricRange({ kind: "x", low: 1, high: 2, days: 3 })).toBe("1–2");
  });

  it("mapea los códigos de error de vinculación", () => {
    expect(lifeLinkErrorMessage("code_consumed")).toBe("Este código ya fue usado.");
    expect(lifeLinkErrorMessage("code_expired")).toMatch(/venció/);
    expect(lifeLinkErrorMessage("desconocido")).toBeUndefined();
    expect(lifeLinkErrorMessage(undefined)).toBeUndefined();
  });
});

describe("lectura de la línea de base por rol", () => {
  it("solo admisión, enfermera de piso y médicos pueden leerla", () => {
    for (const role of ["admision", "enfermera_piso", "medico_residente", "medico_tratante"]) {
      expect(canReadLifeBaseline(role)).toBe(true);
    }
    expect(canReadLifeBaseline("auxiliar_enfermeria")).toBe(false);
    expect(canReadLifeBaseline(undefined)).toBe(false);
  });
});
