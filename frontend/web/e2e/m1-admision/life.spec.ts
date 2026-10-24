import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";
import { advanceAdmission, lifeLinkCode, registerEncounter, type Ctx } from "../support/scenarios";
import { withIngreso } from "../support/ui";

async function fillLifeConsent(page: Page, signer: string, code: string) {
  await page.getByLabel("Nombre de quien firma").fill(signer);
  await page.getByLabel("Acepto el consentimiento informado para atención médica y procedimientos hospitalarios").check();
  await page.getByLabel("El paciente es usuario de la app Vitalsy Life").check();
  await page.getByLabel("Código o QR de autorización").fill(code);
}

async function atConsent(ctx: Ctx) {
  return advanceAdmission(ctx, await registerEncounter(ctx), "consentimiento");
}

test.describe("vinculación con Vitalsy Life", () => {
  test("RF-94 · Admisión · el código Life se normaliza a mayúsculas y valida el formato [E1c-06]", async ({ asRole, api, data }) => {
    const enc = await atConsent({ api, data });
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/consentimiento", enc.encounterId));
    await page.getByLabel("El paciente es usuario de la app Vitalsy Life").check();
    await page.getByLabel("Código o QR de autorización").fill("vl-ab12-cd34");
    await expect(page.getByLabel("Código o QR de autorización")).toHaveValue("VL-AB12-CD34");
    await page.getByLabel("Código o QR de autorización").fill("VL-123");
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByText("Formato VL-XXXX-XXXX").first()).toBeVisible();
  });

  test("RF-94 · Admisión · un código válido importa la línea de base al firmar [E1c-07][E1c-09]", async ({ asRole, api, data }) => {
    const ctx = { api, data };
    const enc = await atConsent(ctx);
    const { code } = await lifeLinkCode(ctx);
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/consentimiento", enc.encounterId));
    await fillLifeConsent(page, enc.patient.fullName, code.toLowerCase());
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByText("Línea de base importada")).toBeVisible();
    // heart_rate se muestra como «Pulso» (lpm) con su rango bajo–alto.
    await expect(page.getByText(/Pulso/).first()).toBeVisible();
    await expect(page.getByText(/lpm/).first()).toBeVisible();
    await expect(page.getByText("Consentimiento firmado.")).toBeVisible();

    const baseline = await (await api("enfermera_piso")).raw("GET", `/hospital-admission/encounters/${enc.encounterId}/life-baseline`);
    expect(baseline.status()).toBe(200);
    const text = await baseline.text();
    expect(text).toContain("heart_rate");
    expect(text, "la línea de base no expone el correo de la cuenta Life").not.toContain("@correo.pe");
  });

  test("RF-94 · Admisión · un código ya usado no vincula y el ingreso continúa [E1c-08]", async ({ asRole, api, data }) => {
    const ctx = { api, data };
    const first = await atConsent(ctx);
    const { code } = await lifeLinkCode(ctx);
    await (await api("admision")).post("/hospital-admission/life-links", { encounterId: first.encounterId, code });

    const enc = await atConsent(ctx);
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/consentimiento", enc.encounterId));
    await fillLifeConsent(page, enc.patient.fullName, code);
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByRole("button", { name: "Reintentar vinculación" })).toBeVisible();
    await expect(page.getByText("El ingreso continúa sin la línea de base domiciliaria.")).toBeVisible();

    const res = await (await api("admision")).raw("POST", "/hospital-admission/life-links", { encounterId: enc.encounterId, code });
    expect(await res.text()).toContain("code_consumed");
  });
});
