import { NAV } from "../../src/app/navigation";
import type { Role } from "../../src/app/roles";
import { ROLE_STEPS, STEP_PATH } from "../../src/modules/admission-census/domain/steps";

// RNF-18: rutas que un rol NO debe poder abrir, derivadas del menú real (navigation.tsx)
// y de los pasos de ingreso por rol (steps.ts). Inicio (/) es de todos.

export function allowedRoutes(role: Role): Set<string> {
  const fromNav = NAV.flatMap((g) => g.items).filter((i) => i.roles.includes(role)).map((i) => i.to);
  const fromSteps = (ROLE_STEPS[role] ?? []).map((s) => STEP_PATH[s]);
  // El camillero y la enfermera de piso abren el censo de pacientes para continuar ingresos.
  return new Set([...fromNav, ...fromSteps]);
}

export function forbiddenRoutes(role: Role): string[] {
  const allowed = allowedRoutes(role);
  const all = new Set([...NAV.flatMap((g) => g.items).map((i) => i.to), ...Object.values(STEP_PATH)]);
  return [...all].filter((path) => path !== "/" && !allowed.has(path)).sort((a, b) => a.localeCompare(b));
}
