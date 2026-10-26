import { expect, test } from "../support/fixtures";
import { hospitalize, recordVitals } from "../support/scenarios";
import { fillVitals } from "../support/ui";

test.describe("expediente clínico", () => {
  test("RF-38 · Expediente · Atención abre el expediente con sus pestañas [E2-01][E2-16]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await recordVitals({ api, data }, hosp, data.vitals("normal"));
    const page = await asRole("medico_tratante");
    await page.goto("/pacientes");
    await page.getByRole("searchbox").or(page.getByLabel(/Buscar/)).first().fill(hosp.patient.dni);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("row").filter({ hasText: hosp.patient.fullName }).getByRole("link", { name: "Atención" }).click();
    await expect(page).toHaveURL(new RegExp(`/atencion/chart\\?ingreso=${hosp.encounterId}`));
    for (const tab of ["Admisión", "Constantes", "Tratamiento", "Paraclínicos", "Evoluciones", "Alertas"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
    await page.getByRole("tab", { name: "Constantes" }).click();
    await expect(page.getByLabel("Lecturas de constantes")).toBeVisible();
  });
});

test.describe("controles programados", () => {
  test("RF-42 · Controles · el control programado aparece y se registra [E2-17]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await recordVitals({ api, data }, hosp, data.vitals("normal"));
    const page = await asRole("enfermera_piso");
    await page.goto("/atencion/controles");
    const row = page.getByLabel("Controles programados").getByRole("row").filter({ hasText: hosp.patient.fullName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Registrar control" }).click();
    await fillVitals(page, data.vitals("normal"));
    await page.getByRole("button", { name: "Confirmar control" }).click();
    await expect(page.getByText(/^Control registrado\. Próximo control: /)).toBeVisible();
  });
});
