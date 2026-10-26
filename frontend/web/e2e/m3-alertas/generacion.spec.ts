import { expect, test } from "../support/fixtures";
import { hospitalize, raiseAlert } from "../support/scenarios";
import { clickAndAwaitTimeline, fillVitals } from "../support/ui";

test.describe("generación de alertas", () => {
  test("RF-41 · Alertas · reevaluación con NEWS2 alterado notifica al médico [E3-04]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const alert = await raiseAlert({ api, data }, hosp, "news2_alto");
    await (await api("enfermera_piso")).post(`/clinical-alerts/${alert.id}/acknowledge`);

    const page = await asRole("enfermera_piso");
    await page.goto(`/alertas/${alert.id}`);
    await page.getByRole("tab", { name: "Nueva toma / NEWS2" }).click();
    await fillVitals(page, data.vitals("news2_alto"));
    await clickAndAwaitTimeline(page, page.getByRole("button", { name: "Recalcular NEWS2" }));
    await expect(page.getByText("NEWS2 sigue alterado: se notificó automáticamente al médico de guardia.")).toBeVisible();
  });
});
