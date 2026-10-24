import { expect, test } from "../support/fixtures";
import { DataGen, runSeed, seedForTest } from "../support/data";
import { advanceDischarge, hospitalize, raiseAlert, type Hosp } from "../support/scenarios";
import { ApiSession } from "../support/api";
import { sessionFile } from "../support/sessions";
import type { Role } from "../../src/app/roles";

// Un piso con 25 pacientes variados: las pantallas deben seguir encontrando, contando y
// mostrando a tiempo a cada paciente.
test.describe.configure({ mode: "serial" });

const floor: { patients: Hosp[]; withAlert: Hosp[]; inDischarge: Hosp[] } = { patients: [], withAlert: [], inDischarge: [] };

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(15 * 60_000);
  const sessions = new Map<Role, ApiSession>();
  const api = async (role: Role) => {
    if (!sessions.has(role)) sessions.set(role, await ApiSession.fromStorage(sessionFile(role)));
    return sessions.get(role)!;
  };
  const data = new DataGen(seedForTest(runSeed(), testInfo.project.name, ["piso-lleno"], 0));
  const ctx = { api, data };
  for (let i = 0; i < 25; i++) {
    const hosp = await hospitalize(ctx, { withBed: i < 3 });
    floor.patients.push(hosp);
    if (i >= 3 && i < 8) {
      await raiseAlert(ctx, hosp, i % 2 === 0 ? "news2_alto" : "news2_medio");
      floor.withAlert.push(hosp);
    } else if (i >= 8 && i < 12) {
      await advanceDischarge(ctx, hosp, (["orden", "epicrisis", "social", "pase"] as const)[i - 8]);
      floor.inDischarge.push(hosp);
    }
  }
  for (const s of sessions.values()) await s.dispose();
});

test("RNF-04 · Piso lleno · el censo encuentra pacientes por nombre y por DNI", async ({ asRole, data }) => {
  const page = await asRole("enfermera_piso");
  for (const p of [data.pick(floor.patients), data.pick(floor.patients), data.pick(floor.patients)]) {
    for (const term of [p.patient.fullName, p.patient.dni]) {
      await page.goto("/pacientes");
      await page.getByRole("searchbox").or(page.getByLabel(/Buscar/)).first().fill(term);
      await page.getByRole("button", { name: "Buscar" }).click();
      await expect(page.getByRole("row").filter({ hasText: p.patient.fullName }), term).toBeVisible({ timeout: 5000 });
    }
  }
});

test("RNF-04 · Piso lleno · la bandeja de alertas muestra todas las alertas abiertas del piso", async ({ asRole }) => {
  const page = await asRole("enfermera_piso");
  await page.goto("/alertas");
  for (const p of floor.withAlert) await expect(page.getByRole("main").getByText(p.patient.fullName).first()).toBeVisible({ timeout: 5000 });
});

test("RNF-04 · Piso lleno · el tablero de egreso lista a los pacientes en circuito", async ({ asRole }) => {
  const page = await asRole("medico_tratante");
  await page.goto("/egreso");
  for (const p of floor.inDischarge.slice(0, 3)) await expect(page.getByText(p.patient.fullName).first()).toBeVisible({ timeout: 5000 });
});

test("RNF-04 · Piso lleno · el inicio de enfermería resume pacientes y alertas", async ({ asRole }) => {
  const page = await asRole("enfermera_piso");
  await page.goto("/");
  const tile = (label: string) => page.locator("div, article, section").filter({ hasText: label }).filter({ has: page.getByText(/^\d+$/) }).last();
  const value = async (label: string) => Number((await tile(label).getByText(/^\d+$/).first().textContent()) ?? "0");
  await expect(tile("Pacientes en turno")).toBeVisible({ timeout: 5000 });
  expect(await value("Pacientes en turno")).toBeGreaterThanOrEqual(floor.patients.length - floor.inDischarge.length);
  expect(await value("Alertas abiertas")).toBeGreaterThanOrEqual(floor.withAlert.length);
});
