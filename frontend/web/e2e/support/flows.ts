import { expect, type Page } from "@playwright/test";
import type { Role } from "../../src/app/roles";
import type { Patient, Vitals } from "./data";
import { fillVitals, withIngreso } from "./ui";

// RNF-18: pasos por pantalla reutilizados por los recorridos de día completo. Cada función
// actúa como la persona del rol correspondiente y afirma el aviso de éxito de la guía.

export type OpenAs = (role: Role) => Promise<Page>;

export async function uiRegister(open: OpenAs, p: Patient, orderNumber: string): Promise<string> {
  const page = await open("admision");
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Número de orden").fill(orderNumber);
  await page.getByLabel("Documento de identidad").fill(p.dni);
  await page.getByLabel("Nombre del paciente").fill(p.fullName);
  await page.getByLabel("Servicio de origen").selectOption(p.origin);
  await page.getByLabel("Pagador asegurador").selectOption(p.payer);
  await page.getByLabel("Estado de cobertura").selectOption(p.coverage);
  await page.getByLabel("Plan de cobertura").fill(p.plan);
  await page.getByLabel("Motivo de ingreso").fill(p.reason);
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/admision\/orden\?ingreso=ENC-/);
  return new URL(page.url()).searchParams.get("ingreso")!;
}

export async function uiAdmissionDesk(open: OpenAs, id: string, p: Patient): Promise<void> {
  const page = await open("admision");
  await page.goto(withIngreso("/admision/orden", id));
  await page.getByRole("button", { name: "Confirmar orden" }).click();
  await expect(page.getByRole("button", { name: "Confirmar orden" })).toBeDisabled();

  await page.goto(withIngreso("/admision/filiacion", id));
  await page.getByLabel("Fecha de nacimiento").fill(p.birthDate);
  await page.getByLabel("Confirmo que los datos coinciden con el documento presentado").check();
  await page.getByRole("button", { name: "Validar filiación" }).click();
  await expect(page.getByText("Filiación validada.")).toBeVisible();

  await page.goto(withIngreso("/admision/cobertura", id));
  if (p.coverage !== "aprobada") {
    await page.getByLabel("Estado de cobertura").selectOption(p.coverage);
    await page.getByRole("button", { name: "Registrar cobertura" }).click();
    await page.getByRole("link", { name: "Derivar trámite" }).click();
    await page.getByLabel("Destino del trámite").selectOption("trabajo_social");
    await page.getByLabel("Nombre del familiar").fill(p.relative.name);
    await page.getByLabel("Teléfono del familiar").fill(p.relative.phone);
    await page.getByRole("button", { name: "Registrar derivación" }).click();
    await expect(page.getByText(/^Derivación registrada a trabajo social/)).toBeVisible();
    await page.goto(withIngreso("/admision/cobertura", id));
  }
  await page.getByLabel("Estado de cobertura").selectOption("aprobada");
  await page.getByRole("button", { name: "Registrar cobertura" }).click();
  await expect(page.getByText("Cobertura registrada. Puede continuar con el brazalete.")).toBeVisible();

  await page.goto(withIngreso("/admision/brazalete", id));
  await page.getByRole("button", { name: "Emitir brazalete" }).click();
  await expect(page.getByText("Brazalete emitido.")).toBeVisible();

  await page.goto(withIngreso("/admision/expediente", id));
  await page.getByRole("button", { name: "Aperturar expediente" }).click();
  await expect(page.getByText(/^Expediente abierto correctamente/)).toBeVisible();
}

export async function uiAssignBed(open: OpenAs, p: Patient): Promise<void> {
  const page = await open("gestion_camas");
  await page.goto("/camas");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await page.getByLabel("Paciente").fill(p.givenNames.split(" ")[0]);
  await page.getByLabel("Resultados de pacientes").getByText(p.fullName).first().click();
  await page.getByLabel("Especialidad").selectOption("medicina_interna");
  await page.getByLabel("Género").selectOption(p.sex);
  await page.getByLabel("Requerimientos de aislamiento").selectOption("ninguno");
  await page.getByRole("button", { name: "Registrar solicitud" }).click();
  await page.getByRole("button", { name: `Asignar lecho compatible a ${p.fullName}` }).click();
  await page.getByRole("button", { name: "Confirmar asignación" }).click();
  await expect(page.getByText(new RegExp(`asignado a ${p.fullName}\\.`))).toBeVisible();
}

export async function uiConsentAndTransfer(open: OpenAs, id: string, p: Patient): Promise<string> {
  const desk = await open("admision");
  await desk.goto(withIngreso("/admision/consentimiento", id));
  await desk.getByLabel("Nombre de quien firma").fill(p.fullName);
  await desk.getByLabel("Acepto el consentimiento informado para atención médica y procedimientos hospitalarios").check();
  await desk.getByRole("button", { name: "Registrar consentimiento" }).click();
  await expect(desk.getByText("Consentimiento firmado.")).toBeVisible();

  const porter = await open("camillero");
  await porter.goto(withIngreso("/traslado/orden", id));
  await porter.getByRole("button", { name: "Consultar traslado" }).click();
  await porter.getByRole("button", { name: "Confirmar traslado" }).click();
  await expect(porter.getByText("Traslado confirmado.")).toBeVisible();
  await porter.goto(withIngreso("/traslado/identidad", id));
  const code = await porter.getByLabel("Código del brazalete").inputValue();
  await porter.getByRole("button", { name: "Verificar brazalete" }).click();
  await expect(porter.getByText(`Identidad confirmada: ${p.fullName}.`)).toBeVisible();
  return code;
}

export async function uiNursingAdmission(open: OpenAs, id: string, p: Patient, baseline: Vitals): Promise<void> {
  const page = await open("enfermera_piso");
  await page.goto(withIngreso("/piso/recepcion", id));
  await page.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(page.getByText("Ingresado").first()).toBeVisible();

  await page.goto(withIngreso("/enfermeria/valoracion", id));
  await page.getByLabel("Motivo de consulta").fill(p.reason);
  await page.getByLabel("Antecedentes").fill("Hipertensión arterial controlada");
  for (const allergy of p.allergies) {
    await page.getByLabel("Alergia (opcional)").fill(allergy);
    await page.getByRole("button", { name: "Agregar alergia" }).click();
  }
  if (p.allergies.length === 0) await page.getByLabel("Ninguna otra conocida.").check();
  await page.getByRole("button", { name: "Guardar valoración" }).click();
  await expect(page.getByText("Valoración registrada.")).toBeVisible();

  await page.goto(withIngreso("/enfermeria/constantes", id));
  await fillVitals(page, baseline);
  await page.getByRole("button", { name: "Registrar constantes" }).click();
  await expect(page.getByText("Constantes registradas.")).toBeVisible();

  await page.goto(withIngreso("/enfermeria/conciliacion", id));
  for (const med of p.homeMeds) {
    await page.getByLabel("Medicamento", { exact: true }).fill(med.name);
    await page.getByLabel("Dosis").fill(med.dose);
    await page.getByLabel("Frecuencia").fill(med.frequency);
    await page.getByLabel("Vía").selectOption(med.route);
    await page.getByRole("button", { name: "Agregar medicamento" }).click();
  }
  if (p.homeMeds.length === 0) await page.getByLabel(/Sin antecedentes farmacológicos/).check();
  if (p.allergies.length > 0) await page.getByLabel("Alergias conocidas (opcional)").fill(p.allergies.join(", "));
  await page.getByRole("button", { name: "Registrar conciliación" }).click();
  await expect(page.getByText(/^(Validada|Con observaciones)/).first()).toBeVisible();

  await page.goto(withIngreso("/enfermeria/riesgos", id));
  await page.getByRole("button", { name: "Registrar escalas" }).click();
  await expect(page.getByText("Escalas registradas.")).toBeVisible();

  await page.goto(withIngreso("/enfermeria/kardex", id));
  await page.getByRole("button", { name: "Confirmar revisión del Kardex" }).click();
  await expect(page.getByText("Kardex revisado.")).toBeVisible();
}

export async function uiSignOrders(open: OpenAs, id: string): Promise<void> {
  const page = await open("medico_residente");
  await page.goto(withIngreso("/medico/indicaciones", id));
  await page.getByRole("button", { name: "Editar prescripciones" }).click();
  await page.getByRole("button", { name: "Agregar indicación" }).click();
  await page.getByLabel(/^Indicación \d+$/).last().fill("Dieta");
  await page.getByLabel("Categoría").last().fill("Dieta");
  await page.getByLabel("Detalle").last().fill("Dieta blanda hiposódica");
  await page.getByRole("button", { name: "Listo" }).click();
  await page.getByLabel("Nombre del médico").fill("Andrés Castillo Ortiz");
  await page.getByLabel("Colegiatura").fill("CMP 045678");
  await page.getByLabel("Confirmo y firmo las indicaciones basales para inicio formal del plan de cuidados en piso.").check();
  await page.getByRole("button", { name: "Firmar indicaciones" }).click();
  await expect(page.getByText("Firmado").first()).toBeVisible();
}

export async function uiDischarge(open: OpenAs, id: string, p: Patient, life: "usuario" | "invitacion" | "rechaza"): Promise<void> {
  const doctor = await open("medico_tratante");
  await doctor.goto(`/egreso/${id}`);
  await doctor.getByRole("button", { name: "Registrar orden de alta" }).click();
  await expect(doctor.getByText(/^Orden digital de alta registrada/)).toBeVisible();

  const resident = await open("medico_residente");
  await resident.goto(`/egreso/${id}`);
  await resident.getByLabel("Diagnósticos").fill(`${p.reason} resuelta`);
  await resident.getByRole("button", { name: "Guardar epicrisis" }).click();
  await expect(resident.getByText("Epicrisis electrónica registrada.")).toBeVisible();
  await resident.getByLabel("Medicamento").fill("Amoxicilina");
  await resident.getByLabel("Dosis").fill("500 mg");
  await resident.getByLabel("Vía").fill("Oral");
  await resident.getByLabel("Frecuencia").fill("cada 8 horas");
  await resident.getByLabel("Días").fill("7");
  await resident.getByRole("button", { name: "Emitir receta" }).click();
  await expect(resident.getByText("Recetas ambulatorias emitidas.")).toBeVisible();

  const social = await open("trabajo_social");
  await social.goto(`/egreso/${id}`);
  await social.getByLabel("Informe de valoración social").fill("Red de apoyo familiar adecuada.");
  await social.getByLabel("¿Entorno adecuado? (si/no)").fill("si");
  await social.getByRole("button", { name: "Guardar valoración" }).click();
  await expect(social.getByText("Valoración social registrada.")).toBeVisible();

  const nurse = await open("enfermera_piso");
  await nurse.goto(`/egreso/${id}`);
  await nurse.getByLabel("Resultado de la conciliación").fill("Se concilian medicamentos domiciliarios con la receta.");
  await nurse.getByRole("button", { name: "Registrar conciliación" }).click();
  await expect(nurse.getByText("Conciliación farmacéutica al alta registrada.")).toBeVisible();
  await nurse.getByLabel("Indicaciones de medicamentos").fill("Amoxicilina cada 8 horas por 7 días");
  const option = { usuario: "Ya es usuario: sincronizar el plan domiciliario", invitacion: "No es usuario: generar invitación", rechaza: "Rechaza el seguimiento digital" }[life];
  await nurse.getByLabel(option).check();
  await nurse.getByRole("button", { name: "Generar informe" }).click();
  await expect(nurse.getByText("Informe digital de alta de enfermería generado.")).toBeVisible();
  await nurse.getByLabel("Nombre de quien recibe").fill(p.relative.name);
  await nurse.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(nurse.getByText("Recepción de indicaciones confirmada.")).toBeVisible();

  const cashier = await open("altas_caja");
  await cashier.goto(`/egreso/${id}`);
  await cashier.getByRole("button", { name: "Marcar liquidación conforme" }).click();
  await expect(cashier.getByText("Estado de cuenta verificado.")).toBeVisible();
  await cashier.getByRole("button", { name: "Emitir pase de salida" }).click();
  await expect(cashier.getByText("Pase de salida digital emitido.")).toBeVisible();

  await nurse.reload();
  await nurse.getByRole("button", { name: "Registrar salida efectiva" }).click();
  await expect(nurse.getByText("Salida efectiva registrada. La cama queda vacante.")).toBeVisible();
}
