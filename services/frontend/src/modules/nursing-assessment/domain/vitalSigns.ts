export type VitalSignFields = {
  respiratoryRate: string;
  oxygenSaturation: string;
  systolicBloodPressure: string;
  pulse: string;
  temperature: string;
};

export type VitalSignErrors = Partial<Record<keyof VitalSignFields, string>>;

const LIMITS: Record<keyof VitalSignFields, { min: number; max: number; label: string }> = {
  respiratoryRate: { min: 4, max: 60, label: "La frecuencia respiratoria" },
  oxygenSaturation: { min: 50, max: 100, label: "La saturación" },
  systolicBloodPressure: { min: 40, max: 280, label: "La presión sistólica" },
  pulse: { min: 20, max: 250, label: "El pulso" },
  temperature: { min: 30, max: 43, label: "La temperatura" },
};

export function validateVitalSigns(fields: VitalSignFields): VitalSignErrors {
  const errors: VitalSignErrors = {};

  (Object.keys(LIMITS) as Array<keyof VitalSignFields>).forEach((key) => {
    const raw = fields[key].trim();
    const rule = LIMITS[key];
    if (!raw) {
      const agreement = key === "pulse" ? "obligatorio" : "obligatoria";
      errors[key] = `${rule.label} es ${agreement}.`;
      return;
    }
    const value = Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      errors[key] = `${rule.label} no es posible. Revise la medición.`;
    }
  });

  return errors;
}
