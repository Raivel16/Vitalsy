export type HomeMedication = {
  name: string;
  dose: string;
  frequency: string;
  route: string;
};

export type ReconciliationState = {
  status: "pendiente" | "validada" | "con_observaciones";
  label: string;
  alerts: string[];
};

const RULES = [
  {
    allergy: /penicil/i,
    drug: /amoxicil|ampicil|penicil/i,
    message: (name: string) => `Posible alergia: ${name} coincide con alergia a penicilina.`,
  },
  {
    allergy: /aine|ibuprofeno|aines/i,
    drug: /ibuprofeno|naproxeno|diclofenaco/i,
    message: (name: string) => `Posible alergia: ${name} pertenece al grupo de los AINE.`,
  },
  {
    allergy: /warfarina|anticoagul/i,
    drug: /ibuprofeno|aspirina|naproxeno/i,
    message: (name: string) => `Posible interacción: ${name} aumenta el riesgo de sangrado con anticoagulación.`,
  },
];

export function reviewReconciliation(allergies: string, medications: HomeMedication[]): ReconciliationState {
  const alerts = medications.flatMap((medication) =>
    RULES.filter((rule) => rule.allergy.test(allergies) && rule.drug.test(medication.name)).map((rule) =>
      rule.message(medication.name),
    ),
  );

  if (medications.length === 0) {
    return { status: "pendiente", label: "Pendiente", alerts };
  }
  if (alerts.length > 0) {
    return { status: "con_observaciones", label: "Con observaciones", alerts };
  }
  return { status: "validada", label: "Validada", alerts };
}
