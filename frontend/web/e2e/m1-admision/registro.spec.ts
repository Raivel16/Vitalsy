import { expect, test } from "../support/fixtures";
import { advanceAdmission, registerEncounter } from "../support/scenarios";
import { capturePrints, withIngreso } from "../support/ui";

test.describe("registro del ingreso", () => {
  test("RF-01 · Admisión · registrar sin datos muestra los obligatorios [E1-01]", async ({ asRole }) => {
    const page = await asRole("admision");
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Plan de cobertura").fill("");
    await page.getByRole("button", { name: "Registrar" }).click();
    for (const msg of ["El número de orden es obligatorio.", "El nombre del paciente es obligatorio.", "El documento es obligatorio.", "El plan de cobertura es obligatorio."]) {
      await expect(page.getByText(msg)).toBeVisible();
    }
    await expect(page).toHaveURL(/\/pacientes\/nuevo$/);
  });

  test("RF-01 · Admisión · el documento solo admite dígitos [E1-02]", async ({ asRole }) => {
    const page = await asRole("admision");
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Documento de identidad").pressSequentially("71A23-4501");
    // La guía dice 712345, pero filtrar «71A23-4501» deja 71234501 (solo se quitan la letra y el guion).
    await expect(page.getByLabel("Documento de identidad")).toHaveValue("71234501");
  });

  test("RF-01 · Admisión · el registro no promete una solicitud de cama inmediata [E1-03]", async ({ asRole }) => {
    const page = await asRole("admision");
    await page.goto("/pacientes/nuevo");
    await expect(page.getByText("se generará la solicitud de asignación inmediata")).toHaveCount(0);
  });
});

test.describe("orden y filiación", () => {
  test("RF-02 · Admisión · consultar, imprimir y confirmar la orden [E1-04][E1-05][E1-06]", async ({ asRole, api, data }) => {
    const enc = await registerEncounter({ api, data });
    const page = await asRole("admision");
    const prints = await capturePrints(page);
    await page.goto(withIngreso("/admision/orden", enc.encounterId));
    await page.getByRole("button", { name: "Consultar orden" }).click();
    await expect(page.getByText(`${enc.patient.fullName} · DNI ${enc.patient.dni}`)).toBeVisible();
    await expect(page.getByText("No indicado").first()).toBeVisible();

    await page.getByRole("button", { name: "Imprimir orden" }).click();
    await expect.poll(async () => (await prints()).map((d) => d.title)).toContain("Orden de internamiento");
    expect((await prints())[0].text).toContain(enc.patient.fullName);

    await page.getByRole("button", { name: "Confirmar orden" }).click();
    await expect(page.getByText("Orden confirmada.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar al siguiente paso" }).or(page.getByRole("button", { name: "Continuar al siguiente paso" }))).toBeVisible();
  });

  test("RF-03 · Admisión · filiación exige fecha y confirmación, luego valida [E1-07][E1-08]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "filiacion");
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/filiacion", enc.encounterId));
    await page.getByRole("button", { name: "Validar filiación" }).click();
    await expect(page.getByText("La fecha de nacimiento es obligatoria.")).toBeVisible();
    await expect(page.getByText("Confirme que los datos coinciden con la orden.")).toBeVisible();

    await page.getByLabel("Fecha de nacimiento").fill(enc.patient.birthDate);
    await page.getByLabel("Confirmo que los datos coinciden con el documento presentado").check();
    await page.getByRole("button", { name: "Validar filiación" }).click();
    await expect(page.getByText("Filiación validada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Validar filiación" })).toBeDisabled();
  });
});
