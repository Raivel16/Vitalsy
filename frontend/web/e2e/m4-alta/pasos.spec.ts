import type { Role } from "../../src/app/roles";
import { expect, test } from "../support/fixtures";
import { advanceAdmission, advanceDischarge, DISCHARGE_STEPS, hospitalize, registerEncounter, type DischargeStep } from "../support/scenarios";

// [rol, método, ruta relativa al ingreso, cuerpo] de cada paso del egreso.
const STEP_CALL: Record<DischargeStep, [Role, string, Record<string, unknown> | undefined]> = {
  orden: ["medico_tratante", "order", undefined],
  epicrisis: ["medico_residente", "epicrisis", { diagnoses: "Neumonía resuelta", procedures: "Ninguno", evolution: "Favorable." }],
  recetas: ["medico_residente", "prescriptions", { items: [{ drug: "Amoxicilina", dose: "500 mg", route: "Oral", frequency: "cada 8 horas", days: 7 }] }],
  social: ["trabajo_social", "social-assessment", { report: "Red de apoyo familiar adecuada.", validated: true }],
  conciliacion: ["enfermera_piso", "reconciliation", { notes: "Se concilian medicamentos domiciliarios." }],
  informe: ["enfermera_piso", "nursing-report", { instructions: "Amoxicilina cada 8 horas por 7 días" }],
  recepcion: ["enfermera_piso", "indication-receipt", { receivedByName: "Julia Ruiz" }],
  cuenta: ["altas_caja", "account", { status: "conforme" }],
  pase: ["altas_caja", "exit-pass", undefined],
  salida: ["enfermera_piso", "exit", undefined],
};

test.describe("gates de secuencia del egreso", () => {
  // Dependencias documentadas en modulo-4-alta.md (la orden abre en paralelo epicrisis, recetas,
  // valoración social y conciliación).
  const gated: [DischargeStep, DischargeStep][] = [
    ["epicrisis", "orden"],
    ["recetas", "orden"],
    ["recepcion", "informe"],
    ["pase", "cuenta"],
    ["salida", "pase"],
  ];
  for (const [step, requires] of gated) {
    test(`RF-54 · Egreso · ${step} se rechaza sin ${requires} [E4]`, async ({ api, data }) => {
      const hosp = await hospitalize({ api, data });
      const before = DISCHARGE_STEPS.indexOf(requires);
      if (before > 0) await advanceDischarge({ api, data }, hosp, DISCHARGE_STEPS[before - 1]);
      const [role, path, body] = STEP_CALL[step];
      const res = await (await api(role)).raw("POST", `/discharge/encounters/${hosp.encounterId}/${path}`, body);
      expect(res.status()).toBe(422);
    });
  }

  test("RF-54 · Egreso · la orden de alta solo procede para ingresos hospitalizados [E4-02]", async ({ api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "orden");
    const res = await (await api("medico_tratante")).raw("POST", `/discharge/encounters/${enc.encounterId}/order`);
    expect(res.status()).toBe(422);
  });
});

test.describe("pasos del egreso por pantalla", () => {
  test("RF-54 · Egreso · el tratante inicia el alta y registra la orden una sola vez [E4-01][E4-02]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    const page = await asRole("medico_tratante");
    await page.goto("/egreso");
    await page.getByLabel("Buscar paciente hospitalizado").fill(hosp.encounterId);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("row").filter({ hasText: hosp.patient.fullName }).getByRole("button", { name: "Iniciar proceso de alta" }).click();
    await expect(page).toHaveURL(new RegExp(`/egreso/${hosp.encounterId}$`));
    await expect(page.getByRole("region", { name: "Quién sigue" })).toBeVisible();
    await page.getByRole("button", { name: "Registrar orden de alta" }).click();
    await expect(page.getByText("Orden digital de alta registrada.", { exact: false })).toBeVisible();

    const again = await (await api("medico_tratante")).raw("POST", `/discharge/encounters/${hosp.encounterId}/order`);
    expect((await again.json()).message).toBe("Este ingreso ya tiene una orden digital de alta.");
  });

  test("RF-55 · Egreso · epicrisis obligatoria y recetas ambulatorias [E4-03][E4-04]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "orden");
    const page = await asRole("medico_residente");
    await page.goto(`/egreso/${hosp.encounterId}`);
    await page.getByLabel("Diagnósticos").fill("");
    await page.getByRole("button", { name: "Guardar epicrisis" }).click();
    await expect(page.getByText("Registre los diagnósticos de la epicrisis.")).toBeVisible();
    await page.getByLabel("Diagnósticos").fill(`${hosp.patient.reason} resuelta`);
    await page.getByLabel("Procedimientos").fill("Ninguno");
    await page.getByLabel("Evolución").fill("Favorable, afebril 48 h.");
    await page.getByRole("button", { name: "Guardar epicrisis" }).click();
    await expect(page.getByText("Epicrisis electrónica registrada.")).toBeVisible();

    await page.getByLabel("Medicamento").fill("Amoxicilina");
    await page.getByLabel("Dosis").fill("500 mg");
    await page.getByLabel("Vía").fill("Oral");
    await page.getByLabel("Frecuencia").fill("cada 8 horas");
    await page.getByLabel("Días").fill("7");
    await page.getByRole("button", { name: "Emitir receta" }).click();
    await expect(page.getByText("Recetas ambulatorias emitidas.")).toBeVisible();
  });

  for (const answer of ["si", "Sí"]) {
    test(`RF-57 · Egreso · la valoración social acepta «${answer}» como entorno adecuado [E4-05]`, async ({ asRole, api, data }) => {
      const hosp = await hospitalize({ api, data });
      await advanceDischarge({ api, data }, hosp, "recetas");
      const page = await asRole("trabajo_social");
      await page.goto(`/egreso/${hosp.encounterId}`);
      await page.getByLabel("Informe de valoración social").fill("Red de apoyo familiar adecuada; domicilio con servicios básicos.");
      await page.getByLabel("¿Entorno adecuado? (si/no)").fill(answer);
      await page.getByRole("button", { name: "Guardar valoración" }).click();
      await expect(page.getByText("Valoración social registrada.")).toBeVisible();
      const c = await (await api("trabajo_social")).get<{ case: { socialAssessment: { validated: boolean } } }>(`/discharge/encounters/${hosp.encounterId}`);
      expect(c.case.socialAssessment.validated).toBe(true);
    });
  }

  test("RF-59 · Egreso · conciliación al alta e informe exigen seguimiento Life [E4-06][E4-07]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "social");
    const page = await asRole("enfermera_piso");
    await page.goto(`/egreso/${hosp.encounterId}`);
    await page.getByLabel("Resultado de la conciliación").fill("Se concilian medicamentos domiciliarios con la receta.");
    await page.getByRole("button", { name: "Registrar conciliación" }).click();
    await expect(page.getByText("Conciliación farmacéutica al alta registrada.")).toBeVisible();

    await page.getByLabel("Indicaciones de medicamentos").fill("Amoxicilina cada 8 horas por 7 días");
    await page.getByLabel("Signos de alarma").fill("Fiebre mayor a 38 C");
    await page.getByLabel("Cuidados domiciliarios").fill("Reposo relativo");
    await page.getByRole("button", { name: "Generar informe" }).click();
    await expect(page.getByText("Indique el seguimiento en Vitalsy Life.").first()).toBeVisible();
  });

  test("RF-61 · Egreso · la recepción de indicaciones queda inmutable [E4-08]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "informe");
    const page = await asRole("enfermera_piso");
    await page.goto(`/egreso/${hosp.encounterId}`);
    await page.getByLabel("Nombre de quien recibe").fill(hosp.patient.relative.name);
    await page.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByText("Recepción de indicaciones confirmada.")).toBeVisible();

    const again = await (await api("enfermera_piso")).raw("POST", `/discharge/encounters/${hosp.encounterId}/indication-receipt`, { receivedByName: "Otra persona" });
    expect((await again.json()).message).toBe("La recepción de indicaciones ya fue registrada y no puede modificarse.");
  });
});
