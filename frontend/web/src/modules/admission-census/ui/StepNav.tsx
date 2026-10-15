import { Link } from "react-router";
import type { Role } from "../../../app/roles";
import { ButtonLink } from "../../../shared/ui/Button";
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
}: Readonly<Props>) {
  const back = previousRoleStep(role, viewingStep);
  const nextPath = nextContinuePath(encounter, role);
  const label = continueLabel
    ?? (encounter.nextRole && encounter.nextRole !== role
      ? "Ver ficha del paciente"
      : "Continuar al siguiente paso");

  return (
    <div className="form-actions-bar step-nav">
      {back ? (
        <Link className="button button-quiet" to={stepPath(back, encounter.encounterId)}>Regresar al paso anterior</Link>
      ) : (
        <Link className="button button-quiet" to={`/pacientes/${encounter.encounterId}`}>Volver a la ficha</Link>
      )}
      {canContinue ? <ButtonLink to={nextPath}>{label}</ButtonLink> : null}
    </div>
  );
}
