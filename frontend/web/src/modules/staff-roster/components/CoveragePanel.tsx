import { useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { SelectField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback } from "../../../shared/ui/Sheet";
import type { StaffCapabilities } from "../domain/capabilities";
import { coverageStatus } from "../domain/coverage";
import { approveCoverage, authorizeCoverage, confirmRetainer } from "../staffApi";
import type { CoverageRequest, StaffMember } from "../types";

/** RF-86/87/88: bitácora de coberturas con la acción que le corresponde a cada perfil. */
export function CoveragePanel({
  requests,
  members,
  capabilities,
  onChanged,
}: {
  requests: CoverageRequest[] | null;
  members: StaffMember[];
  capabilities: StaffCapabilities;
  onChanged: () => void;
}) {
  const [retainers, setRetainers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(id: number, action: () => Promise<unknown>, success: string, fallback: string) {
    setBusy(id);
    setNotice("");
    try {
      await action();
      setError("");
      setNotice(success);
      onChanged();
    } catch (caught) {
      setError(errorText(caught, fallback));
    } finally {
      setBusy(null);
    }
  }

  function confirm(request: CoverageRequest) {
    const userId = retainers[request.id];
    if (!userId) {
      setError("Seleccione al retén que ingresa.");
      return;
    }
    void run(request.id, () => confirmRetainer(request.id, Number(userId)), "Ingreso del retén confirmado.", "No se pudo confirmar el retén.");
  }

  return (
    <Panel title="Coberturas y retén" aside={requests ? `${requests.length} solicitud(es)` : undefined}>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {requests === null ? <LoadingState label="Cargando coberturas…" /> : null}
      {requests && requests.length === 0 ? <p className="hint">No hay solicitudes de cobertura.</p> : null}
      {requests && requests.length > 0 ? (
        <ul className="work-queue">
          {requests.map((request) => {
            const status = coverageStatus(request.status);
            return (
              <li key={request.id} className="work-card">
                <p>
                  <strong>{request.absentName ?? "Personal ausente"}</strong>
                  {request.shiftDate ? ` · ${request.shiftDate}` : ""}
                  {request.reason ? ` · ${request.reason}` : ""}
                </p>
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                {request.approvedByName ? <p className="hint">Aprobó: {request.approvedByName}</p> : null}
                {request.authorizedByName ? <p className="hint">Autorizó RRHH: {request.authorizedByName}</p> : null}
                {request.retainerName ? <p className="hint">Retén: {request.retainerName}</p> : null}

                {capabilities.approveCoverage && request.status === "solicitada" ? (
                  <Button
                    type="button"
                    pending={busy === request.id}
                    onClick={() => void run(request.id, () => approveCoverage(request.id), "Convocatoria de retén aprobada.", "No se pudo aprobar la convocatoria.")}
                  >
                    Aprobar retén
                  </Button>
                ) : null}
                {capabilities.authorizeCoverage && request.status === "aprobada_jefatura" ? (
                  <Button
                    type="button"
                    pending={busy === request.id}
                    onClick={() => void run(request.id, () => authorizeCoverage(request.id), "Cobertura extraordinaria autorizada.", "No se pudo autorizar la cobertura.")}
                  >
                    Autorizar cobertura
                  </Button>
                ) : null}
                {capabilities.confirmRetainer && request.status === "autorizada" ? (
                  <div className="stack ops-form">
                    <SelectField
                      id={`retainer-${request.id}`}
                      label="Retén que ingresa"
                      value={retainers[request.id] ?? ""}
                      onChange={(e) => setRetainers({ ...retainers, [request.id]: e.target.value })}
                    >
                      <option value="">Seleccione personal</option>
                      {members.filter((m) => m.id !== request.absentUserId).map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </SelectField>
                    <Button type="button" pending={busy === request.id} onClick={() => confirm(request)}>
                      Confirmar ingreso del retén
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Panel>
  );
}
