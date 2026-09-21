import { Link } from "react-router";
import type { Role } from "../../../app/roles";
import type { ProgressStep } from "../domain/encounter";
import { canViewRoleStep, stepPath } from "../domain/steps";

type Props = {
  steps: ProgressStep[];
  role?: Role;
  encounterId?: string;
  currentStep?: string;
};

export function AdmissionStepper({ steps, role, encounterId, currentStep }: Props) {
  if (steps.length === 0) return null;
  const current = steps.find((step) => step.state === "current");
  const done = steps.filter((step) => step.state === "done").length;
  const progressCurrent = currentStep ?? current?.id ?? "";

  return (
    <nav className="stepper" aria-label="Avance del ingreso">
      <p className="stepper-summary">
        Paso {Math.min(done + 1, steps.length)} de {steps.length}
        {current ? `: ${current.label}` : ""}
      </p>
      <ol>
        {steps.map((step) => {
          const clickable = Boolean(
            role
            && encounterId
            && progressCurrent
            && canViewRoleStep(role, step.id, steps, progressCurrent),
          );

          return (
            <li
              key={step.id}
              className={`stepper-item stepper-${step.state}${clickable ? " stepper-clickable" : ""}`}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span className="stepper-dot" aria-hidden="true" />
              {clickable ? (
                <Link className="stepper-label" to={stepPath(step.id, encounterId!)}>
                  {step.label}
                </Link>
              ) : (
                <span className="stepper-label">{step.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
