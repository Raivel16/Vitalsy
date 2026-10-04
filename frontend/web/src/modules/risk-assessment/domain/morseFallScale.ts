export type MorseInput = {
  historyOfFalling: boolean;
  secondaryDiagnosis: boolean;
  ambulatoryAid: "none" | "device" | "furniture";
  intravenousAccess: boolean;
  gait: "normal" | "weak" | "impaired";
  mentalStatus: "oriented" | "overestimates";
};

export type MorseLevel = "low" | "moderate" | "high";

export type MorseResult = {
  total: number;
  level: MorseLevel;
  levelLabel: string;
  recommendations: string[];
  source: "Morse Fall Scale; cortes de cuidado agudo 0-24, 25-44 y >=45";
};

const AID_SCORE = { none: 0, device: 15, furniture: 30 } as const;
const GAIT_SCORE = { normal: 0, weak: 10, impaired: 20 } as const;

export function calculateMorse(input: MorseInput): MorseResult {
  const total =
    (input.historyOfFalling ? 25 : 0) +
    (input.secondaryDiagnosis ? 15 : 0) +
    AID_SCORE[input.ambulatoryAid] +
    (input.intravenousAccess ? 20 : 0) +
    GAIT_SCORE[input.gait] +
    (input.mentalStatus === "overestimates" ? 15 : 0);

  if (total >= 45) {
    return {
      total,
      level: "high",
      levelLabel: "Riesgo alto de caídas",
      source: "Morse Fall Scale; cortes de cuidado agudo 0-24, 25-44 y >=45",
      recommendations: [
        "Acompañar la deambulación y las transferencias.",
        "Mantener la cama en posición baja, timbre al alcance y calzado antideslizante.",
        "No dejar al paciente solo durante el aseo o el uso del baño.",
      ],
    };
  }

  if (total >= 25) {
    return {
      total,
      level: "moderate",
      levelLabel: "Riesgo moderado de caídas",
      source: "Morse Fall Scale; cortes de cuidado agudo 0-24, 25-44 y >=45",
      recommendations: [
        "Aplicar precauciones estándar de caídas y reevaluar si cambia la condición.",
        "Dejar el timbre, el agua y los objetos de uso frecuente al alcance.",
      ],
    };
  }

  return {
    total,
    level: "low",
    levelLabel: "Riesgo bajo de caídas",
    source: "Morse Fall Scale; cortes de cuidado agudo 0-24, 25-44 y >=45",
    recommendations: [
      "Mantener cuidados básicos de seguridad y orientar al paciente sobre el entorno.",
    ],
  };
}
