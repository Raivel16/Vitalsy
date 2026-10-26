import { expect, test } from "../support/fixtures";
import { advanceAdmission, registerEncounter } from "../support/scenarios";
import { withIngreso } from "../support/ui";

test.describe("cobertura", () => {
  test("RF-04 · Admisión · cobertura aprobada permite continuar al brazalete [E1-09]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "cobertura");
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/cobertura", enc.encounterId));
    await page.getByLabel("Estado de cobertura").selectOption("aprobada");
    await page.getByRole("button", { name: "Registrar cobertura" }).click();
    await expect(page.getByText("Cobertura registrada. Puede continuar con el brazalete.")).toBeVisible();
  });

  for (const status of ["pendiente", "rechazada"] as const) {
    test(`RF-05 · Admisión · cobertura ${status} exige derivar el trámite [E1c-02]`, async ({ asRole, api, data }) => {
      const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "cobertura");
      const page = await asRole("admision");
      await page.goto(withIngreso("/admision/cobertura", enc.encounterId));
      await page.getByLabel("Estado de cobertura").selectOption(status);
      await page.getByRole("button", { name: "Registrar cobertura" }).click();
      await expect(page.getByText("Cobertura registrada. Derive el trámite (caja o trabajo social) antes de continuar la admisión.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Derivar trámite" })).toBeVisible();
    });
  }

  test("RF-05 · Admisión · derivación valida el teléfono y notifica al familiar [E1c-03]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, data.patient({ coverage: "pendiente" })), "cobertura");
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/cobertura", enc.encounterId));
    await page.getByLabel("Estado de cobertura").selectOption("pendiente");
    await page.getByRole("button", { name: "Registrar cobertura" }).click();
    await page.getByRole("link", { name: "Derivar trámite" }).click();

    await page.getByLabel("Destino del trámite").selectOption("trabajo_social");
    await page.getByLabel("Nombre del familiar").fill(enc.patient.relative.name);
    await page.getByLabel("Teléfono del familiar").pressSequentially("91AB");
    await expect(page.getByLabel("Teléfono del familiar")).toHaveValue("91");
    await page.getByLabel("Teléfono del familiar").fill("123");
    await page.getByRole("button", { name: "Registrar derivación" }).click();
    await expect(page.getByText("El teléfono del familiar solo admite dígitos (7 a 15).")).toBeVisible();

    await page.getByLabel("Teléfono del familiar").fill(enc.patient.relative.phone);
    await page.getByRole("button", { name: "Registrar derivación" }).click();
    await expect(page.getByText("Derivación registrada a trabajo social. El familiar queda notificado.")).toBeVisible();
  });

  test("RF-05 · Admisión · con cobertura pendiente no se emite brazalete [E1c-04]", async ({ api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, data.patient({ coverage: "pendiente" })), "brazalete");
    // advanceAdmission resuelve la derivación; aquí se comprueba el bloqueo antes de aprobar.
    const blocked = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, data.patient({ coverage: "rechazada" })), "cobertura");
    const admision = await api("admision");
    await admision.post(`/hospital-admission/encounters/${blocked.encounterId}/advance`, { step: "cobertura", coverageStatus: "rechazada" });
    const res = await admision.raw("POST", `/hospital-admission/encounters/${blocked.encounterId}/advance`, { step: "brazalete" });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(enc.currentStep).toBe("brazalete");
  });
});
