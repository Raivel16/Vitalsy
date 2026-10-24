import { news2, type VitalsProfile } from "../support/data";
import { expect, test } from "../support/fixtures";
import { hospitalize } from "../support/scenarios";
import { fillVitals, withIngreso } from "../support/ui";

test.describe("constantes y NEWS2 en piso", () => {
  const profiles: VitalsProfile[] = ["normal", "news2_bajo", "news2_medio", "news2_alto"];
  for (const profile of profiles) {
    test(`RF-29 · Monitoreo · constantes ${profile} calculan el NEWS2 y activan alertas cuando corresponde [E2-04][E2-05]`, async ({ asRole, api, data }) => {
      const hosp = await hospitalize({ api, data });
      const v = data.track("constantes", data.vitals(profile));
      const total = news2(v);
      const page = await asRole("enfermera_piso");
      await page.goto(withIngreso("/atencion/constantes", hosp.encounterId));
      await fillVitals(page, v);
      await page.getByRole("button", { name: "Registrar constantes" }).click();
      if (total === 0) {
        await expect(page.getByText(/^NEWS2 0\. Próximo control: /)).toBeVisible();
      } else {
        await expect(page.getByText(`Se activó el proceso de alertas (NEWS2 ${total}).`, { exact: false })).toBeVisible();
      }
      await expect(page.getByLabel("Gráfica evolutiva").first()).toBeVisible();
    });
  }

  test("RF-26 · Monitoreo · la auxiliar registra constantes y queda como autora [E2-15]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("auxiliar_enfermeria");
    await page.goto(withIngreso("/atencion/constantes", hosp.encounterId));
    await fillVitals(page, data.vitals("normal"));
    await page.getByRole("button", { name: "Registrar constantes" }).click();
    await expect(page.getByText(/^NEWS2 0\. Próximo control: /)).toBeVisible();

    // RF-26: el registro debe identificar a su autora (la guía espera ver a la auxiliar).
    await page.goto(withIngreso("/atencion/chart", hosp.encounterId));
    await page.getByRole("tab", { name: "Constantes" }).click();
    await expect(page.getByLabel("Lecturas de constantes").getByText(/Auxiliar de enfermería/)).toBeVisible();
  });
});
