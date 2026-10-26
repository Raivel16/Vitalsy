import { expect, test } from "../support/fixtures";
import { advanceAdmission, registerEncounter } from "../support/scenarios";
import { capturePrints, withIngreso } from "../support/ui";

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

test.describe("brazalete, expediente y consentimiento", () => {
  test("RF-06 · Admisión · emitir brazalete con el formato BRZ-<ingreso>-<iniciales> [E1-10]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "brazalete");
    const page = await asRole("admision");
    const prints = await capturePrints(page);
    await page.goto(withIngreso("/admision/brazalete", enc.encounterId));
    await page.getByRole("button", { name: "Emitir brazalete" }).click();
    await expect(page.getByText("Brazalete emitido.")).toBeVisible();
    const number = enc.encounterId.replace("ENC-", "");
    await expect(page.getByText(`BRZ-${number}-${initials(enc.patient.fullName)}`).first()).toBeVisible();
    await page.getByRole("button", { name: "Imprimir código de barras" }).click();
    await expect.poll(async () => (await prints()).length).toBeGreaterThan(0);
  });

  test("RF-06 · Admisión · el código del brazalete es legible por un lector (sin tildes) [E1-10]", async ({ api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, data.patient({ givenNames: "Ángel Óscar", surnames: "Úrsula Ñique", fullName: "Ángel Óscar Úrsula Ñique" })), "expediente");
    expect(enc.wristband, "Code 128 solo codifica ASCII").toMatch(/^BRZ-[A-Z0-9-]+$/);
  });

  test("RF-07 · Admisión · aperturar expediente sin cama asignada [E1-11]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "expediente");
    const page = await asRole("admision");
    await page.goto(withIngreso("/admision/expediente", enc.encounterId));
    await page.getByRole("button", { name: "Aperturar expediente" }).click();
    await expect(page.getByText(`Expediente abierto correctamente. Identificador EXP-${enc.encounterId.replace("ENC-", "")}.`)).toBeVisible();
    await expect(page.getByText("Pendiente de asignación").first()).toBeVisible();
  });

  test("RF-09 · Admisión · consentimiento valida, imprime y firma [E1-12][E1-13][E1-14][E1-15]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "consentimiento");
    const page = await asRole("admision");
    const prints = await capturePrints(page);
    await page.goto(withIngreso("/admision/consentimiento", enc.encounterId));
    await page.getByLabel("Nombre de quien firma").fill("");
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByText("El nombre de quien firma es obligatorio.")).toBeVisible();
    await expect(page.getByText("Debe aceptar el consentimiento informado.")).toBeVisible();

    await page.getByLabel("Nombre de quien firma").fill(enc.patient.fullName);
    await page.getByLabel("Relación con el paciente").selectOption("titular");
    await page.getByLabel("Acepto el consentimiento informado para atención médica y procedimientos hospitalarios").check();
    await expect(page.getByLabel("El paciente es usuario de la app Vitalsy Life")).not.toBeChecked();
    await expect(page.getByText("Si se desmarca: el ingreso continúa sin vincular la línea de base domiciliaria.")).toBeVisible();

    await page.getByRole("button", { name: "Imprimir consentimiento físico" }).click();
    await expect.poll(async () => (await prints()).map((d) => d.title)).toContain("Consentimiento informado");
    expect((await prints())[0].text).toContain(enc.patient.fullName);

    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByText("Consentimiento firmado.")).toBeVisible();
  });

  test("RF-09 · Admisión · la impresión no ejecuta HTML escrito en el nombre del firmante [E1-14]", { tag: "@hallazgo-HP-11" }, async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "consentimiento");
    const page = await asRole("admision");
    const prints = await capturePrints(page);
    await page.goto(withIngreso("/admision/consentimiento", enc.encounterId));
    await page.getByLabel("Nombre de quien firma").fill('<img src=x id="inyectado">Ana');
    await page.getByRole("button", { name: "Imprimir consentimiento físico" }).click();
    await expect.poll(async () => (await prints()).length).toBeGreaterThan(0);
    expect((await prints())[0].html).not.toContain('<img src="x" id="inyectado">');
  });
});

test.describe("traslado e identidad", () => {
  test("RF-10 · Traslado · consultar y confirmar el traslado [E1-16][E1-17][E1-18]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "traslado");
    const page = await asRole("camillero");
    await page.goto(withIngreso("/traslado/orden", enc.encounterId));
    await expect(page.getByLabel("Número de traslado")).toHaveValue(/^OT-\d{4}-\d{4}$/);
    await page.getByRole("button", { name: "Consultar traslado" }).click();
    await expect(page.getByText(`Habitación ${enc.room} · Lecho ${enc.bed}`).first()).toBeVisible();
    await page.getByRole("button", { name: "Confirmar traslado" }).click();
    await expect(page.getByText("Traslado confirmado.")).toBeVisible();
  });

  test("RF-11 · Traslado · el brazalete correcto confirma la identidad [E1-19]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "identidad");
    const page = await asRole("camillero");
    await page.goto(withIngreso("/traslado/identidad", enc.encounterId));
    await page.getByLabel("Código del brazalete").fill(enc.wristband ?? "");
    await page.getByRole("button", { name: "Verificar brazalete" }).click();
    await expect(page.getByText(`Identidad confirmada: ${enc.patient.fullName}.`)).toBeVisible();
  });

  test("RF-11 · Traslado · el brazalete de otro paciente se rechaza [E1-20]", { tag: "@hallazgo-HP-02" }, async ({ asRole, api, data }) => {
    const other = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "identidad");
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "identidad");
    const page = await asRole("camillero");
    await page.goto(withIngreso("/traslado/identidad", enc.encounterId));
    await page.getByLabel("Código del brazalete").fill(other.wristband ?? "");
    await page.getByRole("button", { name: "Verificar brazalete" }).click();
    await expect(page.getByText(`Identidad confirmada: ${other.patient.fullName}.`)).toHaveCount(0);
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("RF-11 · Traslado · un brazalete inexistente se rechaza [E1-21]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "identidad");
    const page = await asRole("camillero");
    await page.goto(withIngreso("/traslado/identidad", enc.encounterId));
    await page.getByLabel("Código del brazalete").fill("BRZ-9999-XXX");
    await page.getByRole("button", { name: "Verificar brazalete" }).click();
    await expect(page.getByText("El código no corresponde al paciente.")).toBeVisible();
  });
});
