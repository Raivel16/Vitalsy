import { Link } from "react-router";
import type { Role } from "../../../app/roles";
import type { Encounter } from "../domain/encounter";
import { ROLE_STEPS, canViewRoleStep, stepPath } from "../domain/steps";

const LABELS: Record<string, string> = {
  orden: "Orden",
  filiacion: "Filiación",
  cobertura: "Cobertura",
  brazalete: "Brazalete",
  expediente: "Expediente",
  consentimiento: "Consentimiento",
  traslado: "Traslado",
  identidad: "Identidad",
  recepcion: "Recepción",
  valoracion: "Valoración",
  constantes: "Constantes",
  conciliacion: "Conciliación",
  escalas: "Escalas",
  kardex: "Kardex",
  indicaciones: "Indicaciones",
};

export function RoleStepLinks({ role, encounter, viewingStep }: { role: Role; encounter: Encounter; viewingStep: string }) {
  const steps = ROLE_STEPS[role].filter((step) => canViewRoleStep(role, step, encounter.progress, encounter.currentStep));
  if (steps.length === 0) return null;

  return (
    <nav className="role-steps" aria-label="Pasos de su perfil">
      <p>Sus pasos en este ingreso</p>
      <ul>
        {steps.map((step) => {
          const active = (viewingStep === "derivacion" ? "cobertura" : viewingStep) === step;
          const done = encounter.progress?.find((item) => item.id === step)?.state === "done";
          return (
            <li key={step}>
              <Link
                to={stepPath(step, encounter.encounterId)}
                aria-current={active ? "step" : undefined}
                className={active ? "is-active" : done ? "is-done" : undefined}
              >
                {LABELS[step] ?? step}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
