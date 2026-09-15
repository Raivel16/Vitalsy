import { Link } from "react-router";
import type { Role } from "../../../app/roles";
import type { Encounter } from "../domain/encounter";
import { nextContinuePath, previousRoleStep, stepPath } from "../domain/steps";

type Props = {
  role: Role;
  encounter: Encounter;
  viewingStep: string;
  canContinue?: boolean;
  continueLabel?: string;
};

export function StepNav({
  role,
  encounter,
  viewingStep,
  canContinue = false,
  continueLabel,
}: Props) {
  const back = previousRoleStep(role, viewingStep);
  const nextPath = nextContinuePath(encounter, role);
  const label = continueLabel
    ?? (encounter.nextRole && encounter.nextRole !== role
      ? "Ver ficha del paciente"
      : "Continuar al siguiente paso");

  return (
    <div className="actions step-nav">
      {back ? (
        <Link to={stepPath(back, encounter.encounterId)}>Regresar al paso anterior</Link>
      ) : (
        <Link to={`/pacientes/${encounter.encounterId}`}>Volver a la ficha</Link>
      )}
      {canContinue ? <Link className="button" to={nextPath}>{label}</Link> : null}
    </div>
  );
}
