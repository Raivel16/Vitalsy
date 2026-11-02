import { expect, test } from "../support/fixtures";
import { hospitalize } from "../support/scenarios";
import { inOneHour, withIngreso } from "../support/ui";

const DRUGS = [
  { drug: "Paracetamol", dose: "500 mg", route: "VO", frequency: "cada 8 horas", code: "DRUG-PARACETAMOL-500MG" },
  { drug: "Ceftriaxona", dose: "1 g", route: "EV", frequency: "cada 24 horas", code: "DRUG-CEFTRIAXONA-1G" },
  { drug: "Enoxaparina", dose: "40 mg", route: "SC", frequency: "cada 24 horas", code: "DRUG-ENOXAPARINA-40MG" },
];

test.describe("CPOE", () => {
  for (const item of DRUGS) {
    test(`RF-27 · CPOE · registrar ${item.drug} genera su código de barras [E2-02]`, async ({ asRole, api, data }) => {
      // Sin medicación domiciliaria: así no hay CPOE basal y aparece «Nueva prescripción».
      const hosp = await hospitalize({ api, data }, { patient: data.patient({ homeMeds: [] }) });
      const page = await asRole("medico_tratante");
      await page.goto(withIngreso("/atencion/cpoe", hosp.encounterId));
      const form = page.getByRole("form", { name: "Nueva prescripción" });
      await form.getByRole("button", { name: "Registrar CPOE" }).click();
      await expect(page.getByText("Complete medicamento, dosis, vía, frecuencia y primera dosis en cada línea.")).toBeVisible();

      await form.getByLabel("Medicamento").last().fill(item.drug);
      await form.getByLabel("Dosis").last().fill(item.dose);
      await form.getByLabel("Vía").last().fill(item.route);
      await form.getByLabel("Frecuencia").last().selectOption(item.frequency);
      await form.getByLabel("Primera dosis").last().fill(inOneHour());
      await form.getByRole("button", { name: "Registrar CPOE" }).click();
      await expect(page.getByText("Prescripción CPOE registrada. Las dosis ya están programadas en el e-MAR.")).toBeVisible();
      await expect(page.getByText(item.code).first()).toBeVisible();
    });
  }

  test("RF-27 · CPOE · agregar, editar y eliminar un medicamento del plan activo [E2-03]", async ({ asRole, api, data }) => {
    // Sin medicación domiciliaria: así no hay CPOE basal y aparece «Nueva prescripción».
    const hosp = await hospitalize({ api, data }, { patient: data.patient({ homeMeds: [] }) });
    const page = await asRole("medico_tratante");
    await page.goto(withIngreso("/atencion/cpoe", hosp.encounterId));
    const plan = page.getByRole("form", { name: "Nueva prescripción" });
    await plan.getByLabel("Medicamento").last().fill("Paracetamol");
    await plan.getByLabel("Dosis").last().fill("500 mg");
    await plan.getByLabel("Vía").last().fill("VO");
    await plan.getByLabel("Frecuencia").last().selectOption("cada 8 horas");
    await plan.getByLabel("Primera dosis").last().fill(inOneHour());
    await plan.getByRole("button", { name: "Registrar CPOE" }).click();
    await expect(page.getByText("Prescripción CPOE registrada.", { exact: false })).toBeVisible();

    const add = page.getByRole("form", { name: "Agregar medicamento" });
    await add.getByLabel("Medicamento").fill("Omeprazol");
    await add.getByLabel("Dosis").fill("20 mg");
    await add.getByLabel("Vía").fill("VO");
    await add.getByLabel("Frecuencia").selectOption("cada 24 horas");
    await add.getByLabel("Primera dosis").fill(inOneHour());
    await add.getByRole("button", { name: "Agregar al plan" }).click();
    await expect(page.getByText("Medicamento agregado al plan activo.")).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: "Omeprazol" });
    await row.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Medicamento actualizado.")).toBeVisible();
    await page.getByRole("row").filter({ hasText: "Omeprazol" }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Medicamento eliminado del plan.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Omeprazol" })).toHaveCount(0);
  });
});
