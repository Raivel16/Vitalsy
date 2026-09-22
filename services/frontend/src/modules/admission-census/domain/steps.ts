import type { Role } from "../../../app/roles";
import type { Encounter, ProgressStep } from "./encounter";

export const STEP_PATH: Record<string, string> = {
  orden: "/admision/orden",
  filiacion: "/admision/filiacion",
  cobertura: "/admision/cobertura",
  derivacion: "/admision/cobertura",
  brazalete: "/admision/brazalete",
  expediente: "/admision/expediente",
  consentimiento: "/admision/consentimiento",
  traslado: "/traslado/orden",
  identidad: "/traslado/identidad",
  recepcion: "/piso/recepcion",
  valoracion: "/enfermeria/valoracion",
  constantes: "/enfermeria/constantes",
  conciliacion: "/enfermeria/conciliacion",
  escalas: "/enfermeria/riesgos",
  kardex: "/enfermeria/kardex",
  indicaciones: "/medico/indicaciones",
};

export const ROLE_STEPS: Record<Role, string[]> = {
  admision: ["orden", "filiacion", "cobertura", "brazalete", "expediente", "consentimiento"],
  camillero: ["traslado", "identidad"],
  enfermera_piso: ["recepcion", "valoracion", "constantes", "conciliacion", "escalas", "kardex"],
  auxiliar_enfermeria: ["constantes"],
  medico_residente: ["indicaciones"],
  medico_tratante: [],
};

export function stepPath(step: string, encounterId: string): string {
  const path = STEP_PATH[step] ?? "/pacientes";
  return `${path}?ingreso=${encodeURIComponent(encounterId)}`;
}

export function roleStepIndex(role: Role, step: string): number {
  const normalized = step === "derivacion" ? "cobertura" : step;
  return ROLE_STEPS[role].indexOf(normalized);
}

export function previousRoleStep(role: Role, viewingStep: string): string | null {
  const index = roleStepIndex(role, viewingStep);
  if (index <= 0) return null;
  return ROLE_STEPS[role][index - 1] ?? null;
}

export function nextContinuePath(encounter: Encounter, role: Role): string {
  if (canActOnEncounter(role, encounter)) {
    return stepPath(encounter.currentStep, encounter.encounterId);
  }
  return `/pacientes/${encounter.encounterId}`;
}

/** Quién puede pulsar Continuar en el paso vigente del ingreso. */
export function canActOnEncounter(role: Role, encounter: Pick<Encounter, "nextRole" | "currentStep">): boolean {
  if (encounter.nextRole === role) return true;
  if (role === "admision" && encounter.currentStep === "derivacion") return true;
  // RF-12: auxiliar puede registrar constantes basales cuando el paso es de enfermera de piso.
  if (
    role === "auxiliar_enfermeria"
    && encounter.currentStep === "constantes"
    && encounter.nextRole === "enfermera_piso"
  ) {
    return true;
  }
  return false;
}

export function canViewRoleStep(role: Role, step: string, progress: ProgressStep[] | undefined, currentStep: string): boolean {
  const index = roleStepIndex(role, step);
  if (index < 0) return false;
  const currentIndex = roleStepIndex(role, currentStep === "derivacion" ? "cobertura" : currentStep);
  if (currentIndex >= 0 && index <= currentIndex) return true;
  const state = progress?.find((item) => item.id === step)?.state;
  return state === "done" || state === "current";
}
