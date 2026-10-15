export type Spo2Scale = "scale1" | "scale2";
export type Consciousness =
  | "alert"
  | "confusion"
  | "voice"
  | "pain"
  | "unresponsive";
export type ConfusionOnset = "new" | "chronic";
export type News2Band = "low" | "low-medium" | "medium" | "high";
export type News2Visual = "green" | "yellow" | "red";

export type News2Input = {
  respiratoryRate: number;
  oxygenSaturation: number;
  spo2Scale: Spo2Scale;
  supplementalOxygen: boolean;
  systolicBloodPressure: number;
  pulse: number;
  consciousness: Consciousness;
  confusionOnset?: ConfusionOnset;
  temperature: number;
};

export type News2Parameter = {
  id: string;
  label: string;
  score: 0 | 1 | 2 | 3;
};

export type News2Result = {
  total: number;
  parameters: News2Parameter[];
  band: News2Band;
  visual: News2Visual;
  visualLabel: string;
  clinicalResponse: string;
  monitoring: string;
  singleParameterAlert: boolean;
  source: "RCP NEWS2 2017, chart 1";
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

type RespirationScore = 0 | 1 | 2 | 3;

function scoreRespiration(rate: number): RespirationScore {
  const value = Math.round(rate);
  if (value <= 8 || value >= 25) return 3;
  if (value <= 11) return 1;
  if (value <= 20) return 0;
  return 2;
}

function scoreSpo2Scale1(saturation: number): 0 | 1 | 2 | 3 {
  const value = Math.round(saturation);
  if (value <= 91) return 3;
  if (value <= 93) return 2;
  if (value <= 95) return 1;
  return 0;
}

function scoreSpo2Scale2(saturation: number, onOxygen: boolean): 0 | 1 | 2 | 3 {
  const value = Math.round(saturation);
  if (value <= 83) return 3;
  if (value <= 85) return 2;
  if (value <= 87) return 1;
  if (value <= 92) return 0;
  if (!onOxygen) return 0;
  if (value <= 94) return 1;
  if (value <= 96) return 2;
  return 3;
}

function scoreSystolic(pressure: number): 0 | 1 | 2 | 3 {
  const value = Math.round(pressure);
  if (value <= 90 || value >= 220) return 3;
  if (value <= 100) return 2;
  if (value <= 110) return 1;
  return 0;
}

function scorePulse(pulse: number): 0 | 1 | 2 | 3 {
  const value = Math.round(pulse);
  if (value <= 40 || value >= 131) return 3;
  if (value <= 50) return 1;
  if (value <= 90) return 0;
  if (value <= 110) return 1;
  if (value <= 130) return 2;
  return 3;
}

function scoreTemperature(temperature: number): 0 | 1 | 2 | 3 {
  const value = round1(temperature);
  if (value <= 35) return 3;
  if (value <= 36) return 1;
  if (value <= 38) return 0;
  if (value <= 39) return 1;
  return 2;
}

function scoreConsciousness(
  consciousness: Consciousness,
  onset?: ConfusionOnset,
): 0 | 1 | 2 | 3 {
  if (consciousness === "alert") return 0;
  if (consciousness === "confusion" && onset === "chronic") return 0;
  return 3;
}

export function calculateNews2(input: News2Input): News2Result {
  const parameters: News2Parameter[] = [
    {
      id: "respiration",
      label: "Frecuencia respiratoria",
      score: scoreRespiration(input.respiratoryRate),
    },
    {
      id: "spo2",
      label: input.spo2Scale === "scale2" ? "SpO2 escala 2" : "SpO2 escala 1",
      score:
        input.spo2Scale === "scale2"
          ? scoreSpo2Scale2(input.oxygenSaturation, input.supplementalOxygen)
          : scoreSpo2Scale1(input.oxygenSaturation),
    },
    {
      id: "oxygen",
      label: "Aire u oxígeno",
      score: input.supplementalOxygen ? 2 : 0,
    },
    {
      id: "systolic",
      label: "Presión arterial sistólica",
      score: scoreSystolic(input.systolicBloodPressure),
    },
    {
      id: "pulse",
      label: "Pulso",
      score: scorePulse(input.pulse),
    },
    {
      id: "consciousness",
      label: "Conciencia",
      score: scoreConsciousness(input.consciousness, input.confusionOnset),
    },
    {
      id: "temperature",
      label: "Temperatura",
      score: scoreTemperature(input.temperature),
    },
  ];

  const total = parameters.reduce((sum, item) => sum + item.score, 0);
  const singleParameterAlert = parameters.some((item) => item.score === 3);
  const classification = classifyNews2(total, singleParameterAlert);

  return {
    total,
    parameters,
    singleParameterAlert,
    source: "RCP NEWS2 2017, chart 1",
    ...classification,
  };
}

function classifyNews2(total: number, singleParameterAlert: boolean) {
  if (total >= 7) {
    return {
      band: "high" as const,
      visual: "red" as const,
      visualLabel: "Riesgo alto",
      clinicalResponse:
        "Riesgo alto. Evaluación de emergencia por el equipo clínico y considerar traslado a un nivel de cuidado superior.",
      monitoring: "Monitoreo continuo",
    };
  }

  if (total >= 5) {
    return {
      band: "medium" as const,
      visual: "yellow" as const,
      visualLabel: "Riesgo medio",
      clinicalResponse:
        "Riesgo medio. Revisión urgente por un clínico competente en enfermedad aguda.",
      monitoring: "Mínimo cada 1 hora",
    };
  }

  if (singleParameterAlert) {
    return {
      band: "low-medium" as const,
      visual: "yellow" as const,
      visualLabel: "Riesgo bajo-medio",
      clinicalResponse:
        "Riesgo bajo-medio con puntuación de 3 en un parámetro. Revisión urgente por enfermería registrada y considerar evaluación clínica.",
      monitoring: "Mínimo cada 1 hora",
    };
  }

  if (total >= 1) {
    return {
      band: "low-medium" as const,
      visual: "yellow" as const,
      visualLabel: "Riesgo bajo-medio",
      clinicalResponse: "Riesgo bajo-medio. Valoración por enfermería registrada.",
      monitoring: "Mínimo cada 4 a 6 horas",
    };
  }

  return {
    band: "low" as const,
    visual: "green" as const,
    visualLabel: "Riesgo bajo",
    clinicalResponse: "Riesgo bajo. Continuar cuidados rutinarios de sala.",
    monitoring: "Mínimo cada 12 horas",
  };
}
