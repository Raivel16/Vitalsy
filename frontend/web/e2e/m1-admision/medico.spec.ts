import { expect, test } from "../support/fixtures";
import { advanceAdmission, registerEncounter } from "../support/scenarios";
import { withIngreso } from "../support/ui";

test.describe("indicaciones médicas", () => {
  test("RF-18 · Médico · la firma exige indicaciones, nombre, colegiatura y confirmación [E1-32]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "indicaciones");
    const page = await asRole("medico_residente");
    await page.goto(withIngreso("/medico/indicaciones", enc.encounterId));
    await expect(page.getByRole("button", { name: "Firmar indicaciones" })).toBeDisabled();
  });

  test("RF-18 · Médico · firmar cierra el ingreso y crea el CPOE basal [E1-33]", async ({ asRole, api, data }) => {
    const patient = data.patient({ homeMeds: [{ name: "Metformina", dose: "850 mg", frequency: "cada 12 horas", route: "oral" }] });
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, patient), "indicaciones");
    const page = await asRole("medico_residente");
    await page.goto(withIngreso("/medico/indicaciones", enc.encounterId));
    await page.getByRole("button", { name: "Editar prescripciones" }).click();
    await page.getByRole("button", { name: "Agregar indicación" }).click();
    // La guía E1-33 no lo menciona, pero la indicación solo cuenta si tiene título («Indicación N»).
    await page.getByLabel(/^Indicación \d+$/).last().fill("Dieta");
    await page.getByLabel("Categoría").last().fill("Dieta");
    await page.getByLabel("Detalle").last().fill("Dieta blanda hiposódica");
    await page.getByRole("button", { name: "Listo" }).click();
    await page.getByLabel("Nombre del médico").fill("Andrés Castillo Ortiz");
    await page.getByLabel("Colegiatura").fill("CMP 045678");
    await page.getByLabel("Confirmo y firmo las indicaciones basales para inicio formal del plan de cuidados en piso.").check();
    await page.getByRole("button", { name: "Firmar indicaciones" }).click();
    await expect(page.getByText("Firmado").first()).toBeVisible();

    const { encounter } = await (await api("admision")).get<{ encounter: { currentStep: string } }>(`/hospital-admission/encounters/${enc.encounterId}`);
    expect(encounter.currentStep).toBe("cerrado");
    const { prescription } = await (await api("medico_tratante")).get<{ prescription: { items: { drugName: string }[] } | null }>(
      `/inpatient-care/encounters/${enc.encounterId}/prescriptions/active`,
    );
    expect(prescription?.items.map((i) => i.drugName)).toContain("Metformina");
  });
});
