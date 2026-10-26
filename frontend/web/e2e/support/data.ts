import { Faker, es } from "@faker-js/faker";

// RNF-18: datos clínicos variados y reproducibles. Cada prueba recibe su propio
// DataGen sembrado con testSeed(semilla de la corrida, título de la prueba).

export type Payer = "SIS" | "EsSalud" | "SOAT" | "EPS Rímac" | "EPS Pacífico" | "Particular";
export type Coverage = "aprobada" | "pendiente" | "rechazada";
export type HomeMed = { name: string; dose: string; frequency: string; route: string };

export type Patient = {
  fullName: string;
  givenNames: string;
  surnames: string;
  dni: string;
  birthDate: string;
  sex: "male" | "female";
  payer: Payer;
  plan: string;
  coverage: Coverage;
  origin: string;
  reason: string;
  allergies: string[];
  homeMeds: HomeMed[];
  relative: { name: string; phone: string };
};

export type Consciousness = "A" | "C" | "V" | "P" | "U";
export type Vitals = {
  respiratoryRate: number;
  spo2: number;
  spo2Scale: 1 | 2;
  supplementalO2: boolean;
  systolic: number;
  diastolic: number;
  pulse: number;
  temperature: number;
  consciousness: Consciousness;
};
export type VitalsProfile = "normal" | "news2_bajo" | "news2_medio" | "news2_alto";
export type News2Parameter = "respiratoryRate" | "spo2" | "supplementalO2" | "systolic" | "pulse" | "consciousness" | "temperature";

const PLAN: Record<Payer, string> = {
  SIS: "SIS Gratuito",
  EsSalud: "Regular",
  SOAT: "SOAT",
  "EPS Rímac": "Plan EPS",
  "EPS Pacífico": "Plan EPS",
  Particular: "Particular",
};
const ORIGINS = [
  "Emergencia adultos",
  "Consulta externa",
  "Consultorios externos",
  "Derivación interhospitalaria",
  "Quirófano urgencias",
];
const REASONS = [
  "Neumonía adquirida en la comunidad",
  "Insuficiencia cardiaca descompensada",
  "Pielonefritis aguda",
  "Celulitis de miembro inferior",
  "Crisis hipertensiva",
  "Diabetes mellitus descompensada",
  "Exacerbación de EPOC",
  "Hemorragia digestiva alta",
  "Colecistitis aguda",
  "Apendicitis aguda",
];
const ALLERGIES = ["Penicilina", "Sulfas", "AINEs", "Látex", "Yodo"];
const HOME_MEDS: HomeMed[] = [
  { name: "Metformina", dose: "850 mg", frequency: "cada 12 horas", route: "oral" },
  { name: "Losartán", dose: "50 mg", frequency: "cada 24 horas", route: "oral" },
  { name: "Atorvastatina", dose: "20 mg", frequency: "cada 24 horas", route: "oral" },
  { name: "Amoxicilina", dose: "500 mg", frequency: "cada 8 horas", route: "oral" },
  { name: "Omeprazol", dose: "20 mg", frequency: "cada 24 horas", route: "oral" },
  { name: "Enalapril", dose: "10 mg", frequency: "cada 12 horas", route: "oral" },
  { name: "Levotiroxina", dose: "50 mcg", frequency: "cada 24 horas", route: "oral" },
];
const PERU_SURNAMES = [
  "Quispe", "Mamani", "Huamán", "Flores", "Rojas", "Vargas", "Chávez", "Condori", "Ramos", "Castillo",
  "Mendoza", "Salas", "Paredes", "Ccori", "Huanca", "Torres", "Cáceres", "Gonzales", "Delgado", "Medina",
];

/** Puntuación por parámetro según el apéndice A de la guía de pruebas. */
export function news2Breakdown(v: Vitals): Record<News2Parameter, number> {
  const rr = v.respiratoryRate;
  const spo2 =
    v.spo2Scale === 1
      ? v.spo2 <= 91 ? 3 : v.spo2 <= 93 ? 2 : v.spo2 <= 95 ? 1 : 0
      : v.spo2 <= 83 ? 3
        : v.spo2 <= 85 ? 2
          : v.spo2 <= 87 ? 1
            : !v.supplementalO2 || v.spo2 <= 92 ? 0
              : v.spo2 <= 94 ? 1 : v.spo2 <= 96 ? 2 : 3;
  const sbp = v.systolic;
  const hr = v.pulse;
  const t = v.temperature;
  return {
    respiratoryRate: rr <= 8 || rr >= 25 ? 3 : rr >= 21 ? 2 : rr <= 11 ? 1 : 0,
    spo2,
    supplementalO2: v.supplementalO2 ? 2 : 0,
    systolic: sbp <= 90 || sbp >= 220 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : 0,
    pulse: hr <= 40 || hr >= 131 ? 3 : hr >= 111 ? 2 : hr <= 50 || hr >= 91 ? 1 : 0,
    consciousness: v.consciousness === "A" ? 0 : 3,
    temperature: t <= 35 ? 3 : t >= 39.1 ? 2 : t <= 36 || t >= 38.1 ? 1 : 0,
  };
}

export function news2(v: Vitals): number {
  return Object.values(news2Breakdown(v)).reduce((a, b) => a + b, 0);
}

/** FNV-1a de 32 bits sobre la semilla de la corrida y el título completo de la prueba. */
export function testSeed(runSeed: number, titlePath: string[]): number {
  let h = 0x811c9dc5;
  for (const ch of `${runSeed}\u0000${titlePath.join("\u0000")}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Semilla de una prueba concreta: incluye el proyecto (navegador) y la repetición. */
export function seedForTest(runSeed: number, project: string, titlePath: string[], repeatEachIndex: number): number {
  return testSeed(runSeed, [project, String(repeatEachIndex), ...titlePath]);
}

export function runSeed(): number {
  const raw = process.env.E2E_SEED;
  const seed = raw === undefined ? NaN : Number(raw);
  if (!Number.isInteger(seed)) throw new Error("E2E_SEED no está definida: ejecute la suite con `npm run e2e`.");
  return seed;
}

// Valores que dan cada puntuación (sin O2 y escala 1) para variar los perfiles.
type Shift = (f: Faker) => Partial<Vitals>;
const SCORE_1: Record<string, Shift> = {
  respiratoryRate: (f) => ({ respiratoryRate: f.number.int({ min: 9, max: 11 }) }),
  spo2: (f) => ({ spo2: f.number.int({ min: 94, max: 95 }) }),
  systolic: (f) => ({ systolic: f.number.int({ min: 101, max: 110 }) }),
  pulse: (f) => ({ pulse: f.number.int({ min: 91, max: 110 }) }),
  temperature: (f) => ({ temperature: f.number.float({ min: 38.1, max: 39, fractionDigits: 1 }) }),
};
const SCORE_2: Record<string, Shift> = {
  respiratoryRate: (f) => ({ respiratoryRate: f.number.int({ min: 21, max: 24 }) }),
  spo2: (f) => ({ spo2: f.number.int({ min: 92, max: 93 }) }),
  systolic: (f) => ({ systolic: f.number.int({ min: 91, max: 100 }) }),
  pulse: (f) => ({ pulse: f.number.int({ min: 111, max: 130 }) }),
  temperature: (f) => ({ temperature: f.number.float({ min: 39.1, max: 40.5, fractionDigits: 1 }) }),
  supplementalO2: () => ({ supplementalO2: true }),
};
const SCORE_3: Record<string, Shift> = {
  respiratoryRate: (f) => ({ respiratoryRate: f.number.int({ min: 25, max: 36 }) }),
  spo2: (f) => ({ spo2: f.number.int({ min: 84, max: 91 }) }),
  systolic: (f) => ({ systolic: f.number.int({ min: 75, max: 90 }), diastolic: f.number.int({ min: 40, max: 55 }) }),
  pulse: (f) => ({ pulse: f.number.int({ min: 131, max: 150 }) }),
  consciousness: (f) => ({ consciousness: f.helpers.arrayElement<Consciousness>(["C", "V", "P"]) }),
  temperature: (f) => ({ temperature: f.number.float({ min: 34, max: 35, fractionDigits: 1 }) }),
};

export class DataGen {
  readonly seed: number;
  readonly tracked: Record<string, unknown> = {};
  private readonly f: Faker;
  private dniCounter = 0;
  private orderCounter = 0;

  constructor(seed: number) {
    this.seed = seed;
    this.f = new Faker({ locale: [es] });
    this.f.seed(seed);
  }

  /** Registra una entidad creada para adjuntarla al reporte si la prueba falla. */
  track<T>(label: string, value: T): T {
    this.tracked[label] = value;
    return value;
  }

  pick<T>(xs: readonly T[]): T {
    return this.f.helpers.arrayElement(xs);
  }

  int(min: number, max: number): number {
    return this.f.number.int({ min, max });
  }

  dni(): string {
    // Derivado de la semilla y un contador para no depender del estado de faker.
    const n = testSeed(this.seed, ["dni", String(this.dniCounter++)]) % 90_000_000;
    return String(10_000_000 + n);
  }

  orderNumber(): string {
    // Semilla completa de la prueba (base 36) + contador: único por prueba e ingreso.
    return `OI-E2E-${this.seed.toString(36)}-${this.orderCounter++}`;
  }

  phone(): string {
    return `9${this.f.string.numeric(8)}`;
  }

  patient(overrides: Partial<Patient> = {}): Patient {
    const f = this.f;
    const sex = overrides.sex ?? f.helpers.arrayElement<Patient["sex"]>(["male", "female"]);
    const givenNames = `${f.person.firstName(sex)} ${f.person.firstName(sex)}`;
    const surnames = `${f.helpers.arrayElement(PERU_SURNAMES)} ${f.helpers.arrayElement([...PERU_SURNAMES, f.person.lastName()])}`;
    const payer = overrides.payer ?? f.helpers.arrayElement(Object.keys(PLAN) as Payer[]);
    const birth = f.date.birthdate({ mode: "age", min: 18, max: 95 });
    const allergies = f.datatype.boolean({ probability: 0.3 }) ? f.helpers.arrayElements(ALLERGIES, { min: 1, max: 2 }) : [];
    return {
      givenNames,
      surnames,
      fullName: `${givenNames} ${surnames}`,
      dni: this.dni(),
      birthDate: birth.toISOString().slice(0, 10),
      sex,
      payer,
      plan: PLAN[payer],
      coverage: "aprobada",
      origin: f.helpers.arrayElement(ORIGINS),
      reason: f.helpers.arrayElement(REASONS),
      allergies,
      homeMeds: f.helpers.arrayElements(HOME_MEDS, { min: 0, max: 2 }),
      relative: { name: `${f.person.firstName()} ${f.helpers.arrayElement(PERU_SURNAMES)}`, phone: this.phone() },
      ...overrides,
    };
  }

  vitals(profile: VitalsProfile): Vitals {
    const f = this.f;
    const v: Vitals = {
      respiratoryRate: f.number.int({ min: 12, max: 20 }),
      spo2: f.number.int({ min: 96, max: 100 }),
      spo2Scale: 1,
      supplementalO2: false,
      systolic: f.number.int({ min: 111, max: 160 }),
      diastolic: f.number.int({ min: 60, max: 90 }),
      pulse: f.number.int({ min: 51, max: 90 }),
      temperature: f.number.float({ min: 36.1, max: 37.9, fractionDigits: 1 }),
      consciousness: "A",
    };
    const apply = (table: Record<string, Shift>, keys: string[]) => keys.forEach((k) => Object.assign(v, table[k](f)));
    const distinct = (table: Record<string, Shift>, n: number, exclude: string[] = []) =>
      f.helpers.arrayElements(Object.keys(table).filter((k) => !exclude.includes(k)), n);

    switch (profile) {
      case "normal":
        break;
      case "news2_bajo": {
        // 1–2 parámetros con 1 o 2 puntos, sin ninguno en 3: total 1–4.
        for (const key of distinct(SCORE_1, f.number.int({ min: 1, max: 2 }))) {
          apply(f.datatype.boolean() ? SCORE_1 : SCORE_2, [key]);
        }
        break;
      }
      case "news2_medio": {
        // Dos parámetros con 2 y uno con 1 o 2: total 5–6.
        const twos = distinct(SCORE_2, 2);
        apply(SCORE_2, twos);
        const third = distinct(SCORE_1, 1, twos);
        apply(f.datatype.boolean() ? SCORE_1 : SCORE_2, third);
        break;
      }
      case "news2_alto": {
        // Dos parámetros con 3 y uno más con 2: total ≥ 8.
        const threes = distinct(SCORE_3, 2);
        apply(SCORE_3, threes);
        apply(SCORE_2, distinct(SCORE_2, 1, threes));
        break;
      }
    }
    return v;
  }
}
