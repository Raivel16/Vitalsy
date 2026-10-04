export type BradenScore4 = 1 | 2 | 3 | 4;
export type BradenFriction = 1 | 2 | 3;

export type BradenInput = {
  sensoryPerception: BradenScore4;
  moisture: BradenScore4;
  activity: BradenScore4;
  mobility: BradenScore4;
  nutrition: BradenScore4;
  frictionShear: BradenFriction;
};

export type BradenLevel = "none" | "mild" | "moderate" | "high" | "severe";

export type BradenResult = {
  total: number;
  level: BradenLevel;
  levelLabel: string;
  recommendations: string[];
  source: "Braden Scale; 19-23 sin riesgo, 15-18 leve, 13-14 moderado, 10-12 alto, <=9 muy alto";
};

function assertRange(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`La subescala de ${label} está fuera de rango.`);
  }
}

export function calculateBraden(input: BradenInput): BradenResult {
  assertRange(input.sensoryPerception, 1, 4, "percepción sensorial");
  assertRange(input.moisture, 1, 4, "humedad");
  assertRange(input.activity, 1, 4, "actividad");
  assertRange(input.mobility, 1, 4, "movilidad");
  assertRange(input.nutrition, 1, 4, "nutrición");
  assertRange(input.frictionShear, 1, 3, "fricción y cizallamiento");

  const total =
    input.sensoryPerception +
    input.moisture +
    input.activity +
    input.mobility +
    input.nutrition +
    input.frictionShear;

  const source =
    "Braden Scale; 19-23 sin riesgo, 15-18 leve, 13-14 moderado, 10-12 alto, <=9 muy alto" as const;

  if (total <= 9) {
    return {
      total,
      level: "severe",
      levelLabel: "Riesgo muy alto de úlceras por presión",
      source,
      recommendations: [
        "Iniciar cambios posturales programados y protección de prominencias óseas.",
        "Revisar humedad, nutrición y superficies de apoyo en este turno.",
      ],
    };
  }

  if (total <= 12) {
    return {
      total,
      level: "high",
      levelLabel: "Riesgo alto de úlceras por presión",
      source,
      recommendations: [
        "Programar cambios posturales y proteger zonas de apoyo.",
        "Controlar la humedad de la piel y valorar el aporte nutricional.",
      ],
    };
  }

  if (total <= 14) {
    return {
      total,
      level: "moderate",
      levelLabel: "Riesgo moderado de úlceras por presión",
      source,
      recommendations: [
        "Vigilar puntos de presión y reposicionar si la movilidad está limitada.",
      ],
    };
  }

  if (total <= 18) {
    return {
      total,
      level: "mild",
      levelLabel: "Riesgo leve de úlceras por presión",
      source,
      recommendations: [
        "Mantener higiene de piel y estimular los cambios de posición espontáneos.",
      ],
    };
  }

  return {
    total,
    level: "none",
    levelLabel: "Sin riesgo actual de úlceras por presión",
    source,
    recommendations: [
      "Continuar la inspección rutinaria de la piel durante la estancia.",
    ],
  };
}
