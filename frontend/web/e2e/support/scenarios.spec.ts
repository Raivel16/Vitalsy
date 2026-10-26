import { expect, test } from "./fixtures";
import { advanceAdmission, advanceDischarge, alertOf, dischargeCase, driveAlert, hospitalize, raiseAlert, registerEncounter } from "./scenarios";

// RNF-18: humo de las fábricas de escenarios (si fallan, falla toda la suite).

test("hospitalize deja el ingreso cerrado y visible en el censo", async ({ api, data }) => {
  const hosp = await hospitalize({ api, data });
  expect(hosp.currentStep).toBe("cerrado");
  const { encounter } = await (await api("admision")).get<{ encounter: { currentStep: string } }>(`/hospital-admission/encounters/${hosp.encounterId}`);
  expect(encounter.currentStep).toBe("cerrado");
});

test("hospitalize con cobertura pendiente pasa por la derivación", async ({ api, data }) => {
  const hosp = await hospitalize({ api, data }, { patient: data.patient({ coverage: "pendiente" }) });
  expect(hosp.currentStep).toBe("cerrado");
});

test("hospitalize ocupa un lecho del censo", async ({ api, data }) => {
  const hosp = await hospitalize({ api, data });
  expect(hosp.bedId).toBeDefined();
  const { wards } = await (await api("gestion_camas")).get<{ wards: { beds: { id: number; status: string }[] }[] }>("/beds/census");
  expect(wards.flatMap((w) => w.beds).find((b) => b.id === hosp.bedId)?.status).toBe("occupied");
});

test("advanceAdmission hasta identidad deja el ingreso en ese paso", async ({ api, data }) => {
  const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "identidad");
  expect(enc.currentStep).toBe("identidad");
  expect(enc.wristband).toMatch(/^BRZ-/);
});

test("advanceDischarge hasta pase aparece en las salidas autorizadas del camillero", async ({ api, data }) => {
  const hosp = await hospitalize({ api, data });
  await advanceDischarge({ api, data }, hosp, "pase");
  const { cases } = await (await api("camillero")).get<{ cases: { encounterId: string }[] }>("/discharge/authorized-exits");
  expect(cases.map((c) => c.encounterId)).toContain(hosp.encounterId);
});

test("advanceDischarge hasta salida completa los diez entregables", async ({ api, data }) => {
  const hosp = await hospitalize({ api, data });
  await advanceDischarge({ api, data }, hosp, "salida");
  const c = await dischargeCase({ api, data }, hosp);
  expect(c.deliverables.filter((d) => !d.done).map((d) => d.id)).toEqual([]);
});

test("raiseAlert news2_alto aparece en el inbox y driveAlert la lleva a UCI", async ({ api, data }) => {
  const hosp = await hospitalize({ api, data });
  const alert = await raiseAlert({ api, data }, hosp, "news2_alto");
  expect(alert.severity).toBe("alta");
  await driveAlert({ api, data }, alert, "en_uci");
  expect((await alertOf({ api, data }, hosp))?.status).toBe("en_uci");
});
