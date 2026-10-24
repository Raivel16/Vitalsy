import { expect, test } from "../support/fixtures";
import { alertOf, driveAlert, hospitalize, raiseAlert, vitalsBody } from "../support/scenarios";
import { clickAndAwaitTimeline, withIngreso } from "../support/ui";

test.describe("deterioro observado", () => {
  test("RF-40 · Alertas · la auxiliar registra un deterioro y notifica a la enfermera [E3-13]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("auxiliar_enfermeria");
    await page.goto(withIngreso("/alertas/deterioro", hosp.encounterId));
    await page.getByRole("button", { name: "Registrar deterioro" }).click();
    await expect(page.getByText("Describa el deterioro observado.")).toBeVisible();
    await page.getByLabel("Deterioro observado").fill("Paciente pálido, respiración rápida y somnoliento.");
    await page.getByLabel("Severidad percibida").selectOption("alta");
    await page.getByRole("button", { name: "Registrar deterioro" }).click();
    await expect(page.getByText("Se registró el deterioro y se notificó a la enfermera de piso responsable.")).toBeVisible();
    await expect.poll(async () => (await alertOf({ api, data }, hosp))?.source).toBeTruthy();
  });

  test("RF-43 · Alertas · la enfermera pide atención médica y el médico cierra el evento [E3-14][E3-15]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await (await api("auxiliar_enfermeria")).post("/clinical-alerts/observations", {
      encounterId: hosp.encounterId,
      note: "Paciente pálido, respiración rápida y somnoliento.",
      severity: "alta",
    });
    const alert = (await alertOf({ api, data }, hosp))!;
    await (await api("enfermera_piso")).post(`/clinical-alerts/${alert.id}/acknowledge`);

    const nurse = await asRole("enfermera_piso");
    await nurse.goto(`/alertas/${alert.id}`);
    await nurse.getByRole("tab", { name: "Deterioro / preocupación clínica" }).click();
    await nurse.getByRole("button", { name: "Solicitar atención médica" }).click();
    await expect(nurse.getByText("Indique por qué el caso requiere atención médica.")).toBeVisible();
    await nurse.getByLabel("Motivo de la atención médica").fill("Preocupación por empeoramiento rápido.");
    await clickAndAwaitTimeline(nurse, nurse.getByRole("button", { name: "Solicitar atención médica" }));
    await expect(nurse.getByText("Se notificó a los médicos de guardia (residente y tratante).", { exact: false })).toBeVisible();

    await (await api("medico_residente")).post(`/clinical-alerts/${alert.id}/acknowledge`);
    const doctor = await asRole("medico_residente");
    await doctor.goto(`/alertas/${alert.id}`);
    await doctor.getByRole("region", { name: "Atención médica de urgencia" }).getByLabel("Evaluación del paciente").fill("Paciente con taquipnea leve, sin signos de shock.");
    await doctor.getByLabel("Indicaciones médicas de urgencia").fill("Oxígeno por cánula a 2 L/min y control en 1 hora.");
    await clickAndAwaitTimeline(doctor, doctor.getByRole("button", { name: "Registrar atención médica" }));
    await expect(doctor.getByText("Se registró la atención médica y se cerró el evento. Continuidad en sala.")).toBeVisible();
  });
});

test.describe("historial inmutable", () => {
  test("RF-52 · Alertas · el historial lista el circuito completo sin edición [E3-12]", async ({ asRole, api, data }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_alto");
    await driveAlert(ctx, alert, "en_uci");
    await (await api("enfermera_piso")).post(`/clinical-alerts/${alert.id}/icu-return`, { service: "Medicina interna", room: "101", bed: "A" });

    const page = await asRole("medico_residente");
    await page.goto(`/alertas/${alert.id}`);
    const history = page.getByRole("region", { name: "Historial del evento" });
    await expect(history).toBeVisible();
    const items = history.getByRole("listitem");
    expect(await items.count()).toBeGreaterThanOrEqual(8);
    await expect(history.getByRole("button", { name: /Editar|Eliminar|Borrar/ })).toHaveCount(0);
  });

  test("RF-44 · Alertas · programar control con minutos fuera de rango se rechaza [E3-17]", async ({ asRole, api, data }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_medio");
    await (await api("enfermera_piso")).post(`/clinical-alerts/${alert.id}/acknowledge`);
    await (await api("enfermera_piso")).post(`/clinical-alerts/${alert.id}/reassessment`, vitalsBody(data.vitals("normal")));

    const page = await asRole("enfermera_piso");
    await page.goto(`/alertas/${alert.id}`);
    await page.getByLabel("¿Cada cuántos minutos se repetirá el control?").fill("10");
    await page.getByRole("button", { name: "Programar control" }).click();
    await expect(page.getByText("Indique entre 15 y 1440 minutos.")).toBeVisible();
    await page.getByLabel("¿Cada cuántos minutos se repetirá el control?").fill("15");
    await clickAndAwaitTimeline(page, page.getByRole("button", { name: "Programar control" }));
    await expect(page.getByText(/Se programó el próximo control/)).toBeVisible();
  });
});
