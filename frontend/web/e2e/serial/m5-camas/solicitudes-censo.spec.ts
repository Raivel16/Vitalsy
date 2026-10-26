import { expect, test } from "../../support/fixtures";
import { advanceAdmission, census, hospitalize, registerEncounter } from "../../support/scenarios";

test.describe("solicitudes y asignación por pantalla (RF-68/73)", () => {
  test("RF-68 · Camas · la solicitud valida paciente, especialidad y género [E1b-01][E1b-03]", async ({ asRole }) => {
    const page = await asRole("gestion_camas");
    await page.goto("/camas");
    await page.getByRole("button", { name: "Nueva solicitud" }).click();
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    for (const msg of ["Seleccione al paciente o escriba su nombre.", "Indique la especialidad que requiere.", "Indique el género del paciente."]) {
      await expect(page.getByText(msg)).toBeVisible();
    }
  });

  test("RF-73 · Camas · registrar, asignar y confirmar la recepción de la asignación [E1b-02][E1b-04][E1b-05]", async ({ asRole, api, data }) => {
    test.slow();
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "consentimiento", { withoutBed: true });
    const name = enc.patient.fullName;
    const page = await asRole("gestion_camas");
    await page.goto("/camas");
    await page.getByRole("button", { name: "Nueva solicitud" }).click();
    await page.getByLabel("Paciente").fill(enc.patient.givenNames.split(" ")[0]);
    await page.getByLabel("Resultados de pacientes").getByText(name).first().click();
    await page.getByLabel("Especialidad").selectOption("medicina_interna");
    await page.getByLabel("Género").selectOption(enc.patient.sex);
    await page.getByLabel("Requerimientos de aislamiento").selectOption("ninguno");
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await expect(page.getByText("Solicitud de cama registrada. Aparece en la lista de espera priorizada.")).toBeVisible();

    await page.getByRole("button", { name: `Asignar lecho compatible a ${name}` }).click();
    await page.getByRole("button", { name: "Confirmar asignación" }).click();
    await expect(page.getByText(new RegExp(`^Lecho \\S+ asignado a ${name}\\. Notificada a la enfermera supervisora\\.$`))).toBeVisible();

    const sup = await asRole("enfermera_supervisora");
    await sup.goto("/camas");
    await sup.getByRole("button", { name: `Confirmar recepción de la asignación de ${name}` }).click();
    await expect(sup.getByText("Asignación confirmada.")).toBeVisible();
  });
});

test.describe("censo y proyecciones (RF-69/71)", () => {
  test("RF-69 · Camas · el censo refleja la ocupación de un pabellón al asignar [E5-01]", async ({ asRole, api, data }) => {
    const ctx = { api, data };
    const occupied = async () => (await census(ctx)).flatMap((w) => w.beds).filter((b) => b.status === "occupied").length;
    const before = await occupied();
    await hospitalize(ctx);
    expect(await occupied()).toBe(before + 1);

    const page = await asRole("gestion_camas");
    await page.goto("/camas");
    await expect(page.getByLabel("Capacidad hospitalaria")).toBeVisible();
    await expect(page.getByText("Medicina E2E 1").first()).toBeVisible();
  });

  test("RF-71 · Camas · la proyección de alta exige una fecha futura [E5-04]", async ({ asRole, api, data }) => {
    // La proyección se registra sobre pacientes con cama del censo.
    const hosp = await hospitalize({ api, data });
    const page = await asRole("enfermera_supervisora");
    await page.goto("/camas");
    const select = page.getByLabel("Paciente internado");
    const option = select.locator("option").filter({ hasText: hosp.patient.fullName });
    await select.selectOption((await option.getAttribute("value")) ?? "");
    await page.getByLabel("Alta prevista").fill("2020-01-01T10:00");
    await page.getByRole("button", { name: "Registrar proyección" }).click();
    await expect(page.getByText("La fecha prevista debe ser futura.")).toBeVisible();
    await page.getByLabel("Alta prevista").fill("2030-01-01T10:00");
    await page.getByRole("button", { name: "Registrar proyección" }).click();
    await expect(page.getByText("Proyección de alta registrada.")).toBeVisible();
  });
});
