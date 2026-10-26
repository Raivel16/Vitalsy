import { expect, test } from "../support/fixtures";
import { driveAlert, hospitalize, raiseAlert, type Ctx } from "../support/scenarios";

// El circuito se verifica por el estado de la alerta tras cada paso: los avisos de éxito del
// detalle se pierden al recargar (hallazgo cubierto en generacion y deterioro-historial).
async function statusOf(ctx: Ctx, alertId: number) {
  const res = await (await ctx.api("medico_residente")).get<{ alert: { status: string } }>(`/clinical-alerts/${alertId}/timeline`);
  return res.alert.status;
}

test.describe("circuito médico, ERR y UCI", () => {
  test("RF-47 · Alertas · del médico a la UCI y retorno a sala por pantalla [E3-05…E3-11]", async ({ asRole, api, data }) => {
    test.slow();
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_alto");
    await driveAlert(ctx, alert, "medico");

    // E3-06: el médico valida campos y pide al ERR.
    const doctor = await asRole("medico_residente");
    await doctor.goto(`/alertas/${alert.id}`);
    await doctor.getByRole("button", { name: "Registrar atención médica" }).click();
    await expect(doctor.getByText("Registre la evaluación y las indicaciones de urgencia.")).toBeVisible();
    await doctor.getByLabel("Motivo de la intervención especializada").fill("Persiste hipotensión e hipoxemia a pesar de O2.");
    await doctor.getByRole("button", { name: "Solicitar equipo de respuesta rápida" }).click();
    await expect.poll(() => statusOf(ctx, alert.id)).toBe("err_solicitado");

    // E3-07 por API: por pantalla el ERR no puede evaluar tras confirmar (hallazgo cubierto abajo).
    await driveAlert(ctx, alert, "orden_uci", { from: "orden_uci" });
    await expect.poll(() => statusOf(ctx, alert.id)).toBe("orden_uci");

    // E3-08 / E3-09: doble autorización.
    await doctor.reload();
    await doctor.getByRole("button", { name: "Autorizar traslado a UCI" }).click();
    await expect(doctor.getByRole("button", { name: "Autorizar traslado a UCI" })).toHaveCount(0);
    const nurse = await asRole("enfermera_piso");
    await nurse.goto(`/alertas/${alert.id}`);
    await nurse.getByRole("button", { name: "Autorizar traslado a UCI" }).click();
    await expect.poll(() => statusOf(ctx, alert.id)).toBe("uci_autorizada");

    // E3-10 / E3-11: traslado efectivo y retorno a sala.
    await nurse.reload();
    await nurse.getByLabel("Unidad / habitación UCI").fill("UCI-1");
    await nurse.getByLabel("Lecho").first().fill("01");
    await nurse.getByRole("button", { name: "Registrar traslado efectivo" }).click();
    await expect.poll(() => statusOf(ctx, alert.id)).toBe("en_uci");
    await nurse.reload();
    await nurse.getByLabel("Servicio").fill("Medicina interna");
    await nurse.getByLabel("Habitación").fill("101");
    await nurse.getByLabel("Lecho").last().fill("A");
    await nurse.getByRole("button", { name: "Registrar retorno a sala" }).click();
    await expect(nurse.getByRole("status", { name: "Estado de la alerta" })).toContainText("Cerrada");
  });

  test("RF-49 · Alertas · el ERR confirma y evalúa por pantalla [E3-07]", async ({ asRole, api, data }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_alto");
    await driveAlert(ctx, alert, "err");

    const err = await asRole("equipo_respuesta_rapida");
    await err.goto(`/alertas/${alert.id}`);
    await err.getByRole("region", { name: "Confirmación de lectura" }).getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(err.getByRole("region", { name: "Confirmación de lectura" })).toHaveCount(0);
    // Tras el acuse la alerta debe seguir en manos del ERR, no volver a «En atención de enfermería».
    await expect(err.getByRole("status", { name: "Estado de la alerta" })).not.toContainText("En atención de enfermería");
    await expect(err.getByRole("region", { name: "Evaluación del equipo de respuesta rápida" })).toBeVisible();
  });

  test("RF-49 · Alertas · el acuse del ERR no devuelve la alerta a enfermería [E3-07]", async ({ api, data }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_alto");
    await driveAlert(ctx, alert, "err");
    await (await api("equipo_respuesta_rapida")).post(`/clinical-alerts/${alert.id}/acknowledge`);
    expect(await statusOf(ctx, alert.id)).not.toBe("en_atencion");
  });

  test("RF-48 · Alertas · la UCI requiere autorización de médico y de enfermera [E3-08]", async ({ api, data }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_alto");
    await driveAlert(ctx, alert, "orden_uci");
    await (await api("medico_residente")).post(`/clinical-alerts/${alert.id}/icu-authorize`);
    const early = await (await api("enfermera_piso")).raw("POST", `/clinical-alerts/${alert.id}/icu-transfer`, { service: "UCI", room: "UCI-1", bed: "01" });
    expect(early.status(), "sin la autorización de enfermería no hay traslado").toBe(422);
  });
});
