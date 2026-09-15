import type { ProgressStep } from "../domain/encounter";

export function AdmissionStepper({ steps }: { steps: ProgressStep[] }) {
  if (steps.length === 0) return null;
  const current = steps.find((step) => step.state === "current");
  const done = steps.filter((step) => step.state === "done").length;

  return (
    <nav className="stepper" aria-label="Avance del ingreso">
      <p className="stepper-summary">
        Paso {Math.min(done + 1, steps.length)} de {steps.length}
        {current ? `: ${current.label}` : ""}
      </p>
      <ol>
        {steps.map((step) => (
          <li key={step.id} className={`stepper-item stepper-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
            <span className="stepper-dot" aria-hidden="true" />
            <span className="stepper-label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
