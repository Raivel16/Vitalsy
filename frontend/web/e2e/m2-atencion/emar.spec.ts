import { expect, test } from "../support/fixtures";
import { emarDoses, hospitalize, prescribe } from "../support/scenarios";
import { withIngreso } from "../support/ui";

async function preparedDose(ctx: Parameters<typeof hospitalize>[0]) {
  const hosp = await hospitalize(ctx);
  const { codes } = await prescribe(ctx, hosp, [{ drug: "Paracetamol", dose: "500 mg", route: "VO", frequency: "cada 8 horas" }]);
  const doses = await emarDoses(ctx, hosp);
  return { hosp, code: codes[0], dose: doses.find((d) => d.status === "pendiente")! };
}

test.describe("e-MAR y los cinco correctos", () => {
  test("RF-33 · e-MAR · el panel de verificación al pie de cama se abre por dosis [E2-06]", async ({ asRole, api, data }) => {
    const { hosp } = await preparedDose({ api, data });
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/atencion/emar", hosp.encounterId));
    await page.getByRole("button", { name: /Verificar y administrar|Justificar \/ Administrar/ }).first().click();
    await expect(page.getByText("Verificación de Seguridad al Pie de Cama · 5 Correctos")).toBeVisible();
  });

  test("RF-34 · e-MAR · un medicamento equivocado bloquea la administración [E2-07]", async ({ asRole, api, data }) => {
    const { hosp } = await preparedDose({ api, data });
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/atencion/emar", hosp.encounterId));
    await page.getByRole("button", { name: /Verificar y administrar|Justificar \/ Administrar/ }).first().click();
    await page.getByLabel("Código paciente (brazalete)").fill(hosp.wristband ?? "");
    await page.getByLabel("Código medicamento").fill("DRUG-OTRO-1MG");
    await page.getByRole("button", { name: "Confirmar administración" }).click();
    await expect(page.getByText("Los cinco correctos no coinciden. Administración bloqueada.")).toBeVisible();
    expect((await emarDoses({ api, data }, hosp)).every((d) => d.status === "pendiente")).toBe(true);
  });

  test("RF-34 · e-MAR · el brazalete de otro paciente bloquea la administración [E2-07]", async ({ asRole, api, data }) => {
    const { hosp, code } = await preparedDose({ api, data });
    const other = await hospitalize({ api, data });
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/atencion/emar", hosp.encounterId));
    await page.getByRole("button", { name: /Verificar y administrar|Justificar \/ Administrar/ }).first().click();
    await page.getByLabel("Código paciente (brazalete)").fill(other.wristband ?? "");
    await page.getByLabel("Código medicamento").fill(code);
    await page.getByRole("button", { name: "Confirmar administración" }).click();
    await expect(page.getByText("Los cinco correctos no coinciden. Administración bloqueada.")).toBeVisible();
  });

  test("RF-35 · e-MAR · los códigos correctos administran y firman la dosis de forma inmutable [E2-08]", async ({ asRole, api, data }) => {
    const { hosp, code, dose } = await preparedDose({ api, data });
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/atencion/emar", hosp.encounterId));
    await page.getByRole("button", { name: /Verificar y administrar|Justificar \/ Administrar/ }).first().click();
    await page.getByLabel("Código paciente (brazalete)").fill(hosp.wristband ?? "");
    await page.getByLabel("Código medicamento").fill(code);
    await page.getByRole("button", { name: "Confirmar administración" }).click();
    await expect(page.getByText("Dosis administrada y firmada.")).toBeVisible();

    const nurse = await api("enfermera_piso");
    const administered = (await emarDoses({ api, data }, hosp)).find((d) => d.status !== "pendiente");
    expect(administered).toBeDefined();
    const again = await nurse.raw("POST", `/inpatient-care/encounters/${hosp.encounterId}/emar/${administered!.id}/administer`, {
      patientBarcode: hosp.wristband,
      drugBarcode: code,
      sign: true,
    });
    expect(again.ok(), "una dosis firmada no se vuelve a administrar").toBe(false);
    expect(dose).toBeDefined();
  });

  test("RF-33 · e-MAR · la pantalla no revela los códigos esperados [E2-06]", async ({ asRole, api, data }) => {
    const { hosp, code } = await preparedDose({ api, data });
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/atencion/emar", hosp.encounterId));
    await page.getByRole("button", { name: /Verificar y administrar|Justificar \/ Administrar/ }).first().click();
    await expect(page.getByText(code)).toHaveCount(0);
  });
});
