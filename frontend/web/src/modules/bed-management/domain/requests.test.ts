import { describe, expect, it } from "vitest";
import type { PatientOption } from "../types";
import { emptyRequestForm, toPayload, validateRequest } from "./requests";
import { priorityLabel, requestStatusLabel, requirementLabel } from "./priority";

const patient: PatientOption = {
  encounterId: "ENC-1", patientName: "Juan Pérez", documentNumber: "70000001", originService: "Urgencias", gender: "male",
};

describe("etiquetas de la lista de espera (RF-70)", () => {
  it("jerarquiza por gravedad con lenguaje clínico", () => {
    expect(priorityLabel("critica")).toBe("Prioridad 1: Crítica");
    expect(priorityLabel("alta")).toBe("Prioridad 2: Alta");
    expect(priorityLabel("media")).toBe("Prioridad 3: Media");
    expect(priorityLabel("baja")).toBe("Prioridad 4: Baja");
  });

  it("traduce el estado de la solicitud", () => {
    expect(requestStatusLabel("en_espera")).toBe("En lista de espera");
    expect(requestStatusLabel("pendiente")).toBe("Con lecho compatible");
    expect(requestStatusLabel("asignada")).toBe("Asignada");
  });

  it("describe lo que requiere el paciente", () => {
    expect(requirementLabel({ isolation: false, isolationType: "ninguno", equipment: [] })).toBe("Requiere: cama convencional");
    expect(requirementLabel({ isolation: true, isolationType: "gotas", equipment: ["oxigeno_central", "monitor"] }))
      .toBe("Requiere: aislamiento por gotas + oxígeno central + monitor multiparámetro");
    expect(requirementLabel({ isolation: true, isolationType: null, equipment: [] })).toBe("Requiere: aislamiento");
  });
});

describe("formulario de solicitud de cama (RF-68)", () => {
  it("exige paciente, especialidad y género antes de enviar", () => {
    const errors = validateRequest(emptyRequestForm());
    expect(errors.patient).toMatch(/paciente/i);
    expect(errors.specialty).toMatch(/especialidad/i);
    expect(errors.gender).toMatch(/género/i);
  });

  it("acepta un paciente seleccionado con género conocido", () => {
    const form = { ...emptyRequestForm(), patient, gender: "male" as const, specialty: "medicina_interna" };
    expect(validateRequest(form)).toEqual({});
  });

  it("rechaza un nombre libre demasiado corto", () => {
    const form = { ...emptyRequestForm(), freeName: "Al", gender: "female" as const, specialty: "cirugia" };
    expect(validateRequest(form).patient).toMatch(/al menos 3/i);
  });

  it("arma el payload con el ingreso y sin valores ocultos", () => {
    const form = {
      ...emptyRequestForm(),
      source: "quirofano", priority: "critica", patient, gender: "male" as const, specialty: "cirugia",
      isolationType: "contacto", equipment: ["monitor"],
    };
    expect(toPayload(form)).toEqual({
      source: "quirofano", priority: "critica", encounterId: "ENC-1", specialty: "cirugia", gender: "male",
      isolationType: "contacto", equipment: ["monitor"],
    });
  });

  it("usa el nombre libre cuando no hay ingreso", () => {
    const form = { ...emptyRequestForm(), freeName: "Paciente sin ingreso", gender: "female" as const, specialty: "cirugia" };
    expect(toPayload(form)).toMatchObject({ patientName: "Paciente sin ingreso", gender: "female" });
    expect(toPayload(form)).not.toHaveProperty("encounterId");
  });
});
