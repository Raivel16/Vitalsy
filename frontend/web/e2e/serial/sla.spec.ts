import { artisan } from "../support/env";
import { expect, test } from "../support/fixtures";
import { emarDoses, hospitalize, inbox, prescribe, raiseAlert, vitalsBody } from "../support/scenarios";

// Plazos de config/vitalsy.php: acuse enfermera 5 min, supervisora 5 min, gracia e-MAR 30 min.
function processSlas(): string {
  return artisan("alerts:process-slas");
}

test.describe("escalamiento por SLA (reloj E2E)", () => {
  test("RF-45 · Alertas · sin acuse escala a la supervisora y luego al médico [E3-16]", async ({ api, data, clock }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_medio");

    await clock.advance(6);
    expect(processSlas()).toMatch(/Escalamientos de enfermería: [1-9]/);
    expect((await inbox(ctx, "enfermera_supervisora")).map((a) => a.id)).toContain(alert.id);

    await clock.advance(6);
    processSlas();
    expect((await inbox(ctx, "medico_residente")).map((a) => a.id)).toContain(alert.id);
  });

  test("RF-42 · Alertas · un control programado vencido genera alerta de origen control [E3-18]", async ({ api, data, clock }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const alert = await raiseAlert(ctx, hosp, "news2_medio");
    const nurse = await api("enfermera_piso");
    await nurse.post(`/clinical-alerts/${alert.id}/acknowledge`);
    await nurse.post(`/clinical-alerts/${alert.id}/reassessment`, vitalsBody(data.vitals("normal")));
    await nurse.post(`/clinical-alerts/${alert.id}/monitoring-schedule`, { frequencyMinutes: 15 });

    await clock.advance(16);
    processSlas();
    const mine = (await inbox(ctx, "enfermera_piso")).filter((a) => a.encounterId === hosp.encounterId && a.id !== alert.id);
    expect(mine.map((a) => a.source)).toContain("control");
  });

  test("RF-32 · Alertas · una dosis e-MAR pendiente tras 30 min de gracia genera alerta [E3-19]", async ({ api, data, clock }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx, { patient: data.patient({ homeMeds: [] }) });
    await prescribe(ctx, hosp, [{ drug: "Paracetamol", dose: "500 mg", route: "VO", frequency: "cada 8 horas" }]);
    const dose = (await emarDoses(ctx, hosp)).find((d) => d.status === "pendiente")!;
    const target = Math.max(Date.now(), new Date(dose.scheduledAt).getTime()) + 31 * 60_000;

    await clock.set(new Date(target));
    expect(processSlas()).toMatch(/Dosis e-MAR vencidas: [1-9]/);
    const mine = (await inbox(ctx, "enfermera_piso")).filter((a) => a.encounterId === hosp.encounterId);
    expect(mine.map((a) => a.source)).toContain("emar");
  });
});
