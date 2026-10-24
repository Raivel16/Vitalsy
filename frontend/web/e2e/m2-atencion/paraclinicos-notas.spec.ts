import { expect, test } from "../support/fixtures";
import { hospitalize } from "../support/scenarios";
import { withIngreso } from "../support/ui";

test.describe("laboratorio, imágenes y visita", () => {
  test("RF-21 · Atención · integrar laboratorio desde el LIS [E2-09]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("medico_residente");
    await page.goto(withIngreso("/atencion/laboratorio", hosp.encounterId));
    await page.getByRole("button", { name: "Integrar desde LIS" }).click();
    await expect(page.getByText("2 resultados integrados desde el LIS.")).toBeVisible();
    await expect(page.getByText(/Hemoglobina/).first()).toBeVisible();
    await expect(page.getByText(/Creatinina/).first()).toBeVisible();
  });

  test("RF-22 · Atención · integrar imágenes desde el PACS [E2-10]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("medico_residente");
    await page.goto(withIngreso("/atencion/imagenes", hosp.encounterId));
    await page.getByRole("button", { name: "Integrar desde PACS" }).click();
    await expect(page.getByText("2 informes integrados desde el PACS.")).toBeVisible();
    await expect(page.getByText(/Radiografía de tórax/).first()).toBeVisible();
  });

  test("RF-23 · Atención · la visita médica consolida laboratorio, imágenes y notas [E2-11]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("medico_residente");
    await page.goto(withIngreso("/atencion/visita", hosp.encounterId));
    for (const block of ["Laboratorio", "Imágenes", "Notas de enfermería"]) await expect(page.getByLabel(block)).toBeVisible();
  });
});

test.describe("evoluciones y cuidados", () => {
  test("RF-24 · Atención · evolución médica obligatoria y registrada en el historial [E2-12]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("medico_residente");
    await page.goto(withIngreso("/atencion/evolucion", hosp.encounterId));
    await page.getByRole("button", { name: "Registrar evolución" }).click();
    await expect(page.getByText("La nota de evolución es obligatoria.")).toBeVisible();
    const note = `Paciente con mejoría clínica, afebril, tolera vía oral (${data.int(1, 99)}).`;
    await page.getByLabel("Nota de evolución").fill(note);
    await page.getByRole("button", { name: "Registrar evolución" }).click();
    await expect(page.getByText("Evolución registrada.")).toBeVisible();
    await expect(page.getByLabel("Notas registradas").getByText(note)).toBeVisible();
  });

  test("RF-36 · Cuidados · nota de enfermería con mínimo 5 caracteres [E2-13]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/atencion/cuidados", hosp.encounterId));
    await page.getByLabel("Nota de evolución").fill("Hola");
    await page.getByRole("button", { name: "Registrar nota" }).click();
    await expect(page.getByText("La nota debe tener al menos 5 caracteres.")).toBeVisible();
    await page.getByLabel("Nota de evolución").fill("Paciente descansa, sin dolor.");
    await page.getByRole("button", { name: "Registrar nota" }).click();
    await expect(page.getByText("Nota de enfermería registrada.")).toBeVisible();
    // El historial se agrupa por día y viene plegado.
    const notes = page.getByRole("region", { name: "Notas registradas" });
    await notes.getByText("Pulse para expandir o plegar").first().click();
    await expect(notes.getByText("Paciente descansa, sin dolor.")).toBeVisible();
  });

  test("RF-37 · Cuidados · la auxiliar registra un cuidado directo y valida «Otros» [E2-14]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("auxiliar_enfermeria");
    await page.goto(withIngreso("/atencion/cuidados", hosp.encounterId));
    await page.getByRole("tab", { name: /Actividades/ }).click();
    await page.getByLabel("Actividad realizada").selectOption({ label: "Higiene de manos / oral" });
    await page.getByRole("button", { name: "Marcar finalizado" }).click();
    await expect(page.getByText("Cuidado directo registrado: Higiene de manos / oral.")).toBeVisible();

    await page.getByLabel("Actividad realizada").selectOption({ label: "Otros" });
    await page.getByRole("button", { name: "Marcar finalizado" }).click();
    await expect(page.getByText("Describa la actividad (mínimo 3 caracteres).")).toBeVisible();
  });
});
