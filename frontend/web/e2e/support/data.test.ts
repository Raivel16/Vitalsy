import { describe, expect, it } from "vitest";
import { DataGen, news2, news2Breakdown, testSeed, type Vitals, type VitalsProfile } from "./data";

const e3_01: Vitals = {
  respiratoryRate: 28,
  spo2: 89,
  spo2Scale: 1,
  supplementalO2: true,
  systolic: 85,
  diastolic: 50,
  pulse: 135,
  temperature: 39.5,
  consciousness: "V",
};

const e1_27: Vitals = {
  respiratoryRate: 16,
  spo2: 97,
  spo2Scale: 1,
  supplementalO2: false,
  systolic: 120,
  diastolic: 80,
  pulse: 72,
  temperature: 36.8,
  consciousness: "A",
};

describe("news2 (apéndice A de la guía)", () => {
  it("news2 del ejemplo E3-01 vale 19", () => {
    expect(news2(e3_01)).toBe(19);
  });

  it("news2 de constantes normales E1-27 vale 0", () => {
    expect(news2(e1_27)).toBe(0);
  });

  it("P3 basal (FR 22, pulso 95) vale 3 y P4 basal (SpO2 95) vale 1", () => {
    expect(news2({ ...e1_27, respiratoryRate: 22, pulse: 95, temperature: 37 })).toBe(3);
    expect(news2({ ...e1_27, respiratoryRate: 19, spo2: 95, systolic: 130, pulse: 88, temperature: 37.2 })).toBe(1);
  });
});

describe("DataGen", () => {
  const seeds = Array.from({ length: 50 }, (_, i) => 1000 + i);
  const inRange: Record<VitalsProfile, (v: Vitals) => boolean> = {
    normal: (v) => news2(v) === 0,
    news2_bajo: (v) => news2(v) >= 1 && news2(v) <= 4 && !singleParameterThree(v),
    news2_medio: (v) => news2(v) >= 5 && news2(v) <= 6,
    news2_alto: (v) => news2(v) >= 7,
  };

  for (const profile of Object.keys(inRange) as VitalsProfile[]) {
    it(`perfil ${profile} cae en su banda NEWS2 con 50 semillas`, () => {
      for (const seed of seeds) {
        const v = new DataGen(seed).vitals(profile);
        expect(inRange[profile](v), `${profile} semilla ${seed}: ${JSON.stringify(v)} → ${news2(v)}`).toBe(true);
      }
    });
  }

  it("la misma semilla produce el mismo paciente", () => {
    expect(new DataGen(42).patient()).toEqual(new DataGen(42).patient());
  });

  it("semillas distintas producen pacientes distintos", () => {
    expect(new DataGen(42).patient().dni).not.toBe(new DataGen(43).patient().dni);
  });

  it("dni de 8 dígitos y único en 2 000 pacientes de semillas distintas", () => {
    const dnis = new Set<string>();
    for (let seed = 0; seed < 1000; seed++) {
      const gen = new DataGen(testSeed(7, ["archivo.spec.ts", `prueba ${seed}`]));
      for (const p of [gen.patient(), gen.patient()]) {
        expect(p.dni).toMatch(/^\d{8}$/);
        dnis.add(p.dni);
      }
    }
    expect(dnis.size).toBe(2000);
  });

  it("los pacientes tienen datos coherentes para la admisión", () => {
    for (const seed of seeds) {
      const p = new DataGen(seed).patient();
      expect(p.fullName).toBe(`${p.givenNames} ${p.surnames}`);
      expect(p.fullName.length).toBeLessThanOrEqual(120);
      expect(p.relative.phone).toMatch(/^9\d{8}$/);
      const age = new Date().getUTCFullYear() - Number(p.birthDate.slice(0, 4));
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(96);
    }
  });

  it("testSeed es estable para el mismo título y cambia con otro", () => {
    expect(testSeed(7, ["a.spec.ts", "x"])).toBe(testSeed(7, ["a.spec.ts", "x"]));
    expect(testSeed(7, ["a.spec.ts", "x"])).not.toBe(testSeed(7, ["a.spec.ts", "y"]));
    expect(testSeed(7, ["a.spec.ts", "x"])).not.toBe(testSeed(8, ["a.spec.ts", "x"]));
  });
});

function singleParameterThree(v: Vitals): boolean {
  return Object.values(news2Breakdown(v)).includes(3);
}
