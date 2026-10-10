import { useAuth } from "../../../app/AuthProvider";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { AbsencePanel } from "../components/AbsencePanel";
import { AssignmentPanel } from "../components/AssignmentPanel";
import { CoveragePanel } from "../components/CoveragePanel";
import { HandoverPanel } from "../components/HandoverPanel";
import { RosterPanel } from "../components/RosterPanel";
import { capabilitiesFor } from "../domain/capabilities";
import { useCoverage, useStaffMembers } from "../hooks/useStaffData";

const TITLE: Record<string, string> = {
  jefatura_enfermeria: "Rol de turnos mensual y programación del servicio",
  enfermera_piso: "Entrega de turno",
  recursos_humanos: "Solicitudes de cobertura del servicio",
  enfermera_supervisora: "Turnos, asignación y cobertura",
};

const LEAD: Record<string, string> = {
  jefatura_enfermeria: "Publique el rol mensual y apruebe las convocatorias de retén.",
  enfermera_piso: "Consolide las constantes, la medicación y las alertas del turno, y firme la recepción.",
  recursos_humanos: "Valide la justificación y autorice la cobertura extraordinaria.",
  enfermera_supervisora: "Balancee la carga del turno según NEWS2 y registre las inasistencias.",
};

/** Compone el tablero de personal según las capacidades del perfil (RF-78 a RF-88). */
export function StaffBoardPage() {
  const { user } = useAuth();
  const role = user?.role;
  const capabilities = role ? capabilitiesFor(role) : null;
  const needsMembers = Boolean(capabilities && (capabilities.publishRoster || capabilities.assign || capabilities.recordAbsence || capabilities.confirmRetainer || capabilities.handover));
  const { members, error: membersError } = useStaffMembers(needsMembers);
  const coverage = useCoverage(Boolean(capabilities?.viewCoverage));

  if (!role || !capabilities) {
    return <Feedback tone="error">Esta vista no está disponible para su perfil.</Feedback>;
  }

  return (
    <Sheet kicker="Gestión de personal" title={TITLE[role] ?? "Personal"} wide clinic="board" className="floor-care ops-board">
      <p className="lead">{LEAD[role]}</p>
      {membersError ? <Feedback tone="error">{membersError}</Feedback> : null}
      {coverage.error ? <Feedback tone="error">{coverage.error}</Feedback> : null}

      {capabilities.assign ? (
        <div className="ops-split ops-supervision">
          <AssignmentPanel members={members} />
          <aside className="ops-stack ops-side" aria-label="Contingencias y coberturas">
            {capabilities.recordAbsence ? <AbsencePanel members={members} onRecorded={() => coverage.reload()} /> : null}
            <CoveragePanel
              requests={coverage.requests}
              members={members}
              capabilities={capabilities}
              onChanged={() => coverage.reload()}
            />
          </aside>
        </div>
      ) : (
        <div className="ops-stack">
          {capabilities.publishRoster ? <RosterPanel members={members} /> : null}
          {capabilities.handover ? <HandoverPanel /> : null}
          {capabilities.viewCoverage ? (
            <CoveragePanel
              requests={coverage.requests}
              members={members}
              capabilities={capabilities}
              onChanged={() => coverage.reload()}
            />
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
