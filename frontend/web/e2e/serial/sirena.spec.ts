import type { Page } from "@playwright/test";
import { news2 } from "../support/data";
import { expect, test } from "../support/fixtures";
import { alertOf, hospitalize, inbox } from "../support/scenarios";
import { fillVitals, withIngreso } from "../support/ui";

// Estas pruebas verifican los avisos emergentes y la sirena: no se ocultan.
test.use({ quietAlerts: false });

/** Cuenta los inicios y paradas de la sirena (osciladores de Web Audio). */
async function spySiren(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __siren?: { starts: number; stops: number } };
    w.__siren = { starts: 0, stops: 0 };
    const start = OscillatorNode.prototype.start;
    const stop = OscillatorNode.prototype.stop;
    OscillatorNode.prototype.start = function (...args: Parameters<typeof start>) {
      w.__siren!.starts++;
      return start.apply(this, args);
    };
    OscillatorNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      w.__siren!.stops++;
      return stop.apply(this, args);
    };
  });
  return () => page.evaluate(() => (window as Window & { __siren?: { starts: number; stops: number } }).__siren!);
}

// La sirena es por rol: se prueba en la fase serial y tras confirmar las alertas pendientes
// que dejaron otras pruebas, para que solo suene la de este paciente.
test("RF-53 · Alertas · NEWS2 alto genera aviso y sirena, y la sirena para al confirmar [E3-01][E3-02][E3-03]", async ({ asRole, api, data }) => {
  const nurseApi = await api("enfermera_piso");
  for (const pending of (await inbox({ api, data }, "enfermera_piso")).filter((a) => a.needsSiren)) {
    await nurseApi.post(`/clinical-alerts/${pending.id}/acknowledge`);
  }
  const hosp = await hospitalize({ api, data });
  const v = data.track("constantes", data.vitals("news2_alto"));
  const nurse = await asRole("enfermera_piso");
  const siren = await spySiren(nurse);
  await nurse.goto(withIngreso("/atencion/constantes", hosp.encounterId));
  await fillVitals(nurse, v);
  await nurse.getByRole("button", { name: "Registrar constantes" }).click();
  await expect(nurse.getByText(`Se activó el proceso de alertas (NEWS2 ${news2(v)}).`, { exact: false })).toBeVisible();

  const toast = nurse.getByLabel("Avisos de alertas").locator("article, li, div").filter({ hasText: hosp.patient.fullName }).first();
  await expect(toast).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await siren()).starts, { timeout: 20_000 }).toBeGreaterThan(0);

  await nurse.goto("/alertas");
  // Dentro de main: el aviso emergente también tiene «Confirmar recepción».
  const card = nurse.getByRole("main").locator("li, article").filter({ hasText: hosp.patient.fullName }).filter({ has: nurse.getByRole("button", { name: "Confirmar recepción" }) }).last();
  await card.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(nurse.getByText(`Confirmó la recepción de la alerta de ${hosp.patient.fullName}.`, { exact: false })).toBeVisible();

  const alert = await alertOf({ api, data }, hosp);
  expect(alert?.severity).toBe("alta");
  expect(alert?.status).not.toBe("cerrada");

  // La sirena pita cada 800 ms; tras confirmar no debe volver a arrancar.
  const startsAfterAck = (await siren()).starts;
  await nurse.waitForTimeout(3 * 800 + 400); // se mide ausencia de pitidos: requiere dejar pasar el tiempo
  expect((await siren()).starts, "la sirena sigue sonando tras confirmar").toBe(startsAfterAck);
});
