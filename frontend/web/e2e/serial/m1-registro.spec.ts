import type { Patient } from "../support/data";
import { expect, test } from "../support/fixtures";

// Registro por pantalla en el proyecto serial: en paralelo, dos registros simultáneos chocan
// por el identificador ENC-… (defecto cubierto por m1-admision/concurrencia.spec.ts).
test.describe("registro del ingreso por perfil", () => {
  const profiles: [string, Partial<Patient>][] = [
    ["SIS masculino", { payer: "SIS", sex: "male" }],
    ["EsSalud femenina", { payer: "EsSalud", sex: "female" }],
    ["EPS Rímac", { payer: "EPS Rímac" }],
    ["Particular", { payer: "Particular" }],
  ];
  for (const [name, overrides] of profiles) {
    test(`RF-01 · Admisión · registra un ingreso ${name} y abre la orden [E1-03]`, async ({ asRole, data }) => {
      const p = data.track("paciente", data.patient(overrides));
      const order = data.orderNumber();
      const page = await asRole("admision");
      await page.goto("/pacientes/nuevo");
      await page.getByLabel("Número de orden").fill(order);
      await page.getByLabel("Documento de identidad").fill(p.dni);
      await page.getByLabel("Nombre del paciente").fill(p.fullName);
      await page.getByLabel("Servicio de origen").selectOption(p.origin);
      await page.getByLabel("Pagador asegurador").selectOption(p.payer);
      await page.getByLabel("Estado de cobertura").selectOption("aprobada");
      await page.getByLabel("Plan de cobertura").fill(p.plan);
      await page.getByLabel("Motivo de ingreso").fill(p.reason);
      await page.getByRole("button", { name: "Registrar" }).click();
      await expect(page).toHaveURL(/\/admision\/orden\?ingreso=ENC-/);
    });
  }

});
