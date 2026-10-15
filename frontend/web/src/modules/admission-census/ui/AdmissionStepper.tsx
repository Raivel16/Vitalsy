import { Link } from "react-router";
import type { Role } from "../../../app/roles";
import type { ProgressStep } from "../domain/encounter";
import { canViewRoleStep, stepPath } from "../domain/steps";

const STEP_SHORT: Record<string, string> = {
  orden: "Orden",
  filiacion: "Filiación",
  cobertura: "Cobertura",
  derivacion: "Cobertura",
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

type Props = {
  steps: ProgressStep[];
  role?: Role;
  encounterId?: string;
  currentStep?: string;
};

export function AdmissionStepper({ steps, role, encounterId, currentStep }: Readonly<Props>) {
  if (steps.length === 0) return null;
  const current = steps.find((step) => step.state === "current");
  const done = steps.filter((step) => step.state === "done").length;
  const progressCurrent = currentStep ?? current?.id ?? "";

  return (
    <nav className="stepper" aria-label="Avance del ingreso">
      <p className="stepper-summary sr-only">
        Paso {Math.min(done + 1, steps.length)} de {steps.length}
        {current ? `: ${current.label}` : ""}
      </p>
      <ol>
        {steps.map((step, index) => {
          const clickable = Boolean(
            role
            && encounterId
            && progressCurrent
            && canViewRoleStep(role, step.id, steps, progressCurrent),
          );
          const short = STEP_SHORT[step.id] ?? step.label;
          const label = (
            <>
              <span className="stepper-num" aria-hidden>{index + 1}</span>
              {short}
            </>
          );

          return (
            <li
              key={step.id}
              className={`stepper-item stepper-${step.state}${clickable ? " stepper-clickable" : ""}`}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {clickable ? (
                <Link className="stepper-label" to={stepPath(step.id, encounterId!)} aria-label={step.label}>
                  {label}
                </Link>
              ) : (
                <span className="stepper-label" aria-label={step.label}>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
