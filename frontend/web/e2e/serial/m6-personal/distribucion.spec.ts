import { expect, test } from "../../support/fixtures";
import { hospitalize, memberId, recordVitals, suggestAssignments, type Hosp } from "../../support/scenarios";
import { NURSES } from "./personas";

// Fechas propias de este archivo: 2027-05.
const WEIGHT = (news2: number) => (news2 >= 7 ? 3 : news2 >= 1 ? 2 : 1);

test.describe("distribución balanceada (RF-79/80)", () => {
  test("RF-79 · Personal · la sugerencia reparte la carga NEWS2 de forma equilibrada", async ({ api, data }) => {
    test.slow();
    const ctx = { api, data };
    const mine: Hosp[] = [];
    for (const profile of ["news2_alto", "news2_alto", "news2_medio", "news2_bajo", "normal", "normal"] as const) {
      const hosp = await hospitalize(ctx);
      await recordVitals(ctx, hosp, data.vitals(profile));
      mine.push(hosp);
    }
    const nurses = [NURSES.rosa, NURSES.lucia, NURSES.carmen];
    const suggestion = await suggestAssignments(ctx, "2027-05-03", nurses);
    data.track("sugerencia", suggestion);

    const ids = suggestion.assignments.map((a) => a.encounterId);
    for (const h of mine) expect(ids).toContain(h.encounterId);

    const loads = new Map<number, number>();
    for (const a of suggestion.assignments) loads.set(a.nurseUserId, (loads.get(a.nurseUserId) ?? 0) + WEIGHT(a.news2Weight));
    const values = [...loads.values()];
    expect(loads.size, "todas las enfermeras reciben pacientes").toBe(nurses.length);
    expect(Math.max(...values) - Math.min(...values), "diferencia de carga ≤ peso máximo de un paciente").toBeLessThanOrEqual(3);
  });

  test("RF-80 · Personal · sugerir sin enfermeras pide seleccionarlas [E6-08]", async ({ asRole }) => {
    const page = await asRole("enfermera_supervisora");
    await page.goto("/personal");
    await page.getByRole("button", { name: "Sugerir distribución" }).click();
    await expect(page.getByText("Seleccione al menos una enfermera del turno.")).toBeVisible();
  });

  test("RF-80 · Personal · la supervisora sugiere, ajusta y aprueba la asignación [E6-08][E6-09]", async ({ asRole }) => {
    const page = await asRole("enfermera_supervisora");
    await page.goto("/personal");
    await page.getByLabel("Fecha del turno").first().fill("2027-05-04");
    const nurses = page.getByRole("group", { name: "Enfermeras del turno" });
    await nurses.getByLabel(/Rosa Quispe/).check();
    await nurses.getByLabel(/Lucía Mendoza/).check();
    await page.getByRole("button", { name: "Sugerir distribución" }).click();
    const proposal = page.getByRole("region", { name: "Propuesta de asignación" }).or(page.getByLabel("Propuesta de asignación"));
    await expect(proposal.first()).toBeVisible();
    await page.getByRole("button", { name: "Aprobar asignación" }).click();
    await expect(page.getByText("Asignación diaria aprobada.")).toBeVisible();
    // RF-80 parcial: no hay notificación persistente, la interfaz no debe afirmarla.
    await expect(page.getByText(/se notific[óo] a la enfermera/i)).toHaveCount(0);
  });

  test("RF-80 · Personal · aprobar con una persona que no es de enfermería se rechaza", async ({ api, data }) => {
    const hosp = await hospitalize({ api, data });
    const notNurse = await memberId({ api, data }, "jefatura_enfermeria@vitalsy.local").catch(() => 1);
    const res = await (await api("enfermera_supervisora")).raw("POST", "/staff/assignments/approve", {
      shiftDate: "2027-05-05",
      assignments: [{ nurseUserId: notNurse, encounterId: hosp.encounterId }],
    });
    expect(res.status()).toBe(422);
  });
});
