import { expect, test } from "../support/fixtures";
import { uiAdmissionDesk, uiAssignBed, uiConsentAndTransfer, uiDischarge, uiNursingAdmission, uiRegister, uiSignOrders } from "../support/flows";
import { fillVitals, withIngreso } from "../support/ui";

// Recorridos completos por pantalla, de la admisión a la cama limpia. Van en la fase serial
// porque registran ingresos por pantalla (en paralelo chocan por el ENC duplicado).

test.describe("día completo de un paciente", () => {
  test("RNF-18 · Día completo · paciente SIS sin alergias: admisión, atención, alta y limpieza de su cama", async ({ asRole, data }) => {
    test.setTimeout(8 * 60_000);
    const p = data.track("paciente", data.patient({ payer: "SIS", coverage: "aprobada", allergies: [], homeMeds: [] }));
    const id = await uiRegister(asRole, p, data.orderNumber());
    await uiAdmissionDesk(asRole, id, p);
    await uiAssignBed(asRole, p);
    const wristband = await uiConsentAndTransfer(asRole, id, p);
    await uiNursingAdmission(asRole, id, p, data.vitals("normal"));
    await uiSignOrders(asRole, id);

    // Atención: CPOE y una dosis administrada con los cinco correctos.
    const doctor = await asRole("medico_tratante");
    await doctor.goto(withIngreso("/atencion/cpoe", id));
    const form = doctor.getByRole("form", { name: "Nueva prescripción" });
    await form.getByLabel("Medicamento").last().fill("Paracetamol");
    await form.getByLabel("Dosis").last().fill("500 mg");
    await form.getByLabel("Vía").last().fill("VO");
    await form.getByLabel("Frecuencia").last().fill("cada 8 horas");
    await form.getByRole("button", { name: "Registrar CPOE" }).click();
    await expect(doctor.getByText(/^Prescripción CPOE registrada/)).toBeVisible();

    const nurse = await asRole("enfermera_piso");
    await nurse.goto(withIngreso("/atencion/emar", id));
    await nurse.getByRole("button", { name: /Verificar y administrar|Justificar \/ Administrar/ }).first().click();
    await nurse.getByLabel("Código paciente (brazalete)").fill(wristband);
    await nurse.getByLabel("Código medicamento").fill("DRUG-PARACETAMOL-500MG");
    await nurse.getByRole("button", { name: "Confirmar administración" }).click();
    await expect(nurse.getByText("Dosis administrada y firmada.")).toBeVisible();

    await uiDischarge(asRole, id, p, "rechaza");

    // La cama liberada queda con su orden de limpieza.
    const cleaner = await asRole("servicios_generales");
    await cleaner.goto("/camas/limpieza");
    await expect(cleaner.getByRole("button", { name: "Registrar desinfección terminada" }).first()).toBeVisible();
  });

  test("RNF-18 · Día completo · paciente alérgico con cobertura pendiente: derivación, alerta y alta con invitación Life", async ({ asRole, data }) => {
    test.setTimeout(8 * 60_000);
    const p = data.track(
      "paciente",
      data.patient({ payer: "EsSalud", coverage: "pendiente", allergies: ["Penicilina"], homeMeds: [{ name: "Amoxicilina", dose: "500 mg", frequency: "cada 8 horas", route: "oral" }] }),
    );
    const id = await uiRegister(asRole, p, data.orderNumber());
    await uiAdmissionDesk(asRole, id, p);
    await uiAssignBed(asRole, p);
    await uiConsentAndTransfer(asRole, id, p);
    await uiNursingAdmission(asRole, id, p, data.vitals("normal"));
    await uiSignOrders(asRole, id);

    // Deterioro: constantes de riesgo alto y confirmación de la alerta desde la bandeja.
    const nurse = await asRole("enfermera_piso");
    await nurse.goto(withIngreso("/atencion/constantes", id));
    await fillVitals(nurse, data.vitals("news2_alto"));
    await nurse.getByRole("button", { name: "Registrar constantes" }).click();
    await expect(nurse.getByText(/^Se activó el proceso de alertas/)).toBeVisible();
    await nurse.goto("/alertas");
    const card = nurse.getByRole("main").locator("li, article").filter({ hasText: p.fullName }).filter({ has: nurse.getByRole("button", { name: "Confirmar recepción" }) }).last();
    await card.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(nurse.getByText(`Confirmó la recepción de la alerta de ${p.fullName}.`, { exact: false })).toBeVisible();

    await uiDischarge(asRole, id, p, "invitacion");
  });
});
