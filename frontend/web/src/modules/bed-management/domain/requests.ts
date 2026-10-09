import type { PatientOption, RequestPayload } from "../types";

export type Gender = "female" | "male";

export type RequestForm = {
  source: string;
  priority: string;
  patient: PatientOption | null;
  freeName: string;
  gender: Gender | "";
  specialty: string;
  isolationType: string;
  equipment: string[];
};

export type RequestErrors = Partial<Record<"patient" | "specialty" | "gender", string>>;

export const SOURCES = [
  { value: "urgencias", label: "Urgencias" },
  { value: "quirofano", label: "Quirófano" },
  { value: "admisiones", label: "Admisión" },
] as const;

export const PRIORITIES = [
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
] as const;

export const ISOLATION_TYPES = [
  { value: "ninguno", label: "Ninguno (cama convencional)" },
  { value: "gotas", label: "Gotas (mascarilla quirúrgica)" },
  { value: "contacto", label: "Contacto (bata + guantes)" },
  { value: "respiratorio", label: "Respiratorio / aerosoles (presión negativa)" },
] as const;

export const EQUIPMENT = [
  { value: "oxigeno_central", label: "Oxígeno central" },
  { value: "monitor", label: "Monitor multiparámetro" },
] as const;

export const SPECIALTY_LABEL: Record<string, string> = {
  medicina_interna: "Medicina interna",
  cirugia: "Cirugía",
};

export const specialtyLabel = (value: string): string => SPECIALTY_LABEL[value] ?? value.replace(/_/g, " ");

export function emptyRequestForm(): RequestForm {
  return {
    source: "urgencias",
    priority: "media",
    patient: null,
    freeName: "",
    gender: "",
    specialty: "",
    isolationType: "ninguno",
    equipment: [],
  };
}

/** Validación previa al envío: el servidor valida de nuevo, pero el usuario ve el motivo de inmediato. */
export function validateRequest(form: RequestForm): RequestErrors {
  const errors: RequestErrors = {};
  const name = form.freeName.trim();
  if (!form.patient && name === "") {
    errors.patient = "Seleccione al paciente o escriba su nombre.";
  } else if (!form.patient && name.length < 3) {
    errors.patient = "El nombre debe tener al menos 3 caracteres.";
  }
  if (form.specialty === "") errors.specialty = "Indique la especialidad que requiere.";
  if (form.gender === "") errors.gender = "Indique el género del paciente.";
  return errors;
}

export function toPayload(form: RequestForm): RequestPayload {
  const base = {
    source: form.source,
    priority: form.priority,
    specialty: form.specialty,
    gender: form.gender as Gender,
    isolationType: form.isolationType,
    equipment: form.equipment,
  };
  return form.patient
    ? { ...base, encounterId: form.patient.encounterId }
    : { ...base, patientName: form.freeName.trim() };
}
