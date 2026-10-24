import { news2 } from "../support/data";
import { expect, test } from "../support/fixtures";
import { advanceAdmission, registerEncounter } from "../support/scenarios";
import { fillVitals, withIngreso } from "../support/ui";

test.describe("recepción y valoración de enfermería", () => {
  test("RF-12 · Enfermería · confirmar la recepción en piso [E1-23]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "recepcion");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/piso/recepcion", enc.encounterId));
    await page.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByText("Ingresado").first()).toBeVisible();
  });

  test("RF-12 · Enfermería · reubicación valida y notifica a la central [E1-24]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "recepcion");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/piso/reubicacion", enc.encounterId));
    await page.getByRole("button", { name: "Notificar reubicación" }).click();
    await expect(page.getByText("El motivo de la discrepancia es obligatorio.")).toBeVisible();
    await expect(page.getByText("Elija un lecho disponible del censo.")).toBeVisible();

    await page.getByLabel("Motivo de la discrepancia").selectOption({ index: 1 });
    const bedSelect = page.getByLabel("Lecho disponible");
    await expect(bedSelect.locator("option")).not.toHaveCount(1);
    const chosen = await bedSelect.locator("option").nth(1).textContent();
    await bedSelect.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Notificar reubicación" }).click();
    await expect(page.getByText(/^Reubicación notificada a la central\. Habitación \S+, lecho \S+\.$/)).toBeVisible();
    expect(chosen).toBeTruthy();
  });

  test("RF-13 · Enfermería · valoración exige motivo y antecedentes, guarda borrador y registra [E1-25][E1-26]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "valoracion");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/valoracion", enc.encounterId));
    await page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(page.getByText("El motivo de consulta es obligatorio.")).toBeVisible();
    await expect(page.getByText("Los antecedentes son obligatorios.")).toBeVisible();

    await page.getByLabel("Motivo de consulta").fill(enc.patient.reason);
    await page.getByLabel("Antecedentes").fill("Hipertensión arterial controlada");
    await page.getByLabel("Ninguna otra conocida.").check();
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("Borrador guardado en este equipo.")).toBeVisible();
    await page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(page.getByText("Valoración registrada.")).toBeVisible();
  });
});

test.describe("constantes de ingreso", () => {
  for (const profile of ["normal", "news2_medio", "news2_alto"] as const) {
    test(`RF-14 · Enfermería · constantes ${profile} muestran su NEWS2 y avisan si hay alerta [E1-27]`, async ({ asRole, api, data }) => {
      const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "constantes");
      const v = data.track("constantes", data.vitals(profile));
      const page = await asRole("enfermera_piso");
      await page.goto(withIngreso("/enfermeria/constantes", enc.encounterId));
      await fillVitals(page, v);
      await expect(page.getByText(new RegExp(`NEWS2\\s*${news2(v)}\\b`)).first()).toBeVisible();
      await page.getByRole("button", { name: "Registrar constantes" }).click();
      await expect(page.getByText("Constantes registradas.")).toBeVisible();
      const notice = page.getByText("Se activó una alerta clínica. Revísela en la campana o en la bandeja de alertas.");
      if (profile === "normal") await expect(notice).toHaveCount(0);
      else await expect(notice).toBeVisible();
    });
  }

  test("RF-14 · Enfermería · valores imposibles se rechazan antes de enviar [E1-28]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "constantes");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/constantes", enc.encounterId));
    await fillVitals(page, { ...data.vitals("normal"), respiratoryRate: 3, spo2: 49, temperature: 44 });
    await page.getByRole("button", { name: "Registrar constantes" }).click();
    await expect(page.getByText("Frecuencia respiratoria no es posible. Revise la medición.", { exact: false })).toBeVisible();
    await expect(page.getByText(/[Ss]aturación no es posible/)).toBeVisible();
    await expect(page.getByText(/[Tt]emperatura no es posible/)).toBeVisible();
    await expect(page.getByText("Constantes registradas.")).toHaveCount(0);
  });
});

test.describe("conciliación, escalas y Kardex", () => {
  test("RF-15 · Enfermería · conciliación sin alergias queda validada [E1-29]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, data.patient({ allergies: [] })), "conciliacion");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/conciliacion", enc.encounterId));
    await page.getByLabel("Medicamento", { exact: true }).fill("Metformina");
    await page.getByLabel("Dosis").fill("850 mg");
    await page.getByLabel("Frecuencia").fill("cada 12 horas");
    await page.getByLabel("Vía").selectOption("oral");
    await page.getByRole("button", { name: "Agregar medicamento" }).click();
    await page.getByRole("button", { name: "Registrar conciliación" }).click();
    await expect(page.getByText("Validada").first()).toBeVisible();
  });

  test("RF-15 · Enfermería · alergia a penicilina con amoxicilina queda con observaciones [E1d]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }, data.patient({ allergies: ["Penicilina"] })), "conciliacion");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/conciliacion", enc.encounterId));
    await page.getByLabel("Medicamento", { exact: true }).fill("Amoxicilina");
    await page.getByLabel("Dosis").fill("500 mg");
    await page.getByLabel("Frecuencia").fill("cada 8 horas");
    await page.getByLabel("Vía").selectOption("oral");
    await page.getByRole("button", { name: "Agregar medicamento" }).click();
    await page.getByLabel("Alergias conocidas (opcional)").fill("Penicilina");
    await expect(page.getByText("Posible alergia: Amoxicilina coincide con alergia a penicilina.")).toBeVisible();
    await page.getByRole("button", { name: "Registrar conciliación" }).click();
    await expect(page.getByText("Con observaciones").first()).toBeVisible();
  });

  test("RF-16 · Enfermería · escalas Morse y Braden sin riesgo [E1-30]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "escalas");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/riesgos", enc.encounterId));
    await expect(page.getByText("Riesgo bajo de caídas").first()).toBeVisible();
    await expect(page.getByText("Sin riesgo actual de úlceras por presión").first()).toBeVisible();
    await page.getByRole("button", { name: "Registrar escalas" }).click();
    await expect(page.getByText("Escalas registradas.")).toBeVisible();
  });

  test("RF-16 · Enfermería · escalas con riesgo alto de caídas y de úlceras [E1-30]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "escalas");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/riesgos", enc.encounterId));
    // Morse: 25 + 15 + 20 + 10 + 15 = 85.
    await page.getByLabel("Antecedente de caídas: sí").check();
    await page.getByLabel("Diagnóstico secundario: sí").check();
    await page.getByLabel("Vía intravenosa: sí").check();
    await page.getByLabel("Marcha: débil").check();
    await page.getByLabel("Sobreestima o olvida límites").check();
    // Braden: 2 × 5 + 1 = 11.
    for (const label of ["Percepción sensorial", "Humedad", "Actividad", "Movilidad", "Nutrición"]) await page.getByLabel(label).selectOption("2");
    await page.getByLabel("Fricción y cizallamiento").selectOption("1");
    await expect(page.getByText("Riesgo alto de caídas").first()).toBeVisible();
    await expect(page.getByText("Riesgo alto de úlceras por presión").first()).toBeVisible();
    await page.getByRole("button", { name: "Registrar escalas" }).click();
    await expect(page.getByText("Escalas registradas.")).toBeVisible();
  });

  test("RF-17 · Enfermería · revisar y confirmar el Kardex [E1-31]", async ({ asRole, api, data }) => {
    const enc = await advanceAdmission({ api, data }, await registerEncounter({ api, data }), "kardex");
    const page = await asRole("enfermera_piso");
    await page.goto(withIngreso("/enfermeria/kardex", enc.encounterId));
    await page.getByRole("button", { name: "Confirmar revisión del Kardex" }).click();
    await expect(page.getByText("Kardex revisado.")).toBeVisible();
  });
});
