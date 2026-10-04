import { type FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

export function StaffBoardPage() {
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_supervisora";
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState("");
  const [nurseIds, setNurseIds] = useState("");
  const [suggestion, setSuggestion] = useState<string>("");
  const [handover, setHandover] = useState<string>("");
  const [fromUserId, setFromUserId] = useState("");
  const [absenceUserId, setAbsenceUserId] = useState("");
  const [requests, setRequests] = useState<Array<{ id: number; status: string }>>([]);

  const loadCoverage = useCallback(async () => {
    if (!["enfermera_supervisora", "jefatura_enfermeria", "recursos_humanos"].includes(role)) return;
    try {
      const data = await api<{ requests: Array<{ id: number; status: string }> }>("/api/v1/staff/coverage-requests");
      setRequests(data.requests);
    } catch {
      // El listado es auxiliar; el resto de la pantalla sigue usable.
    }
  }, [role]);

  useEffect(() => {
    void loadCoverage();
  }, [loadCoverage]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/v1/staff/shift-plans", {
        method: "POST",
        body: JSON.stringify({
          yearMonth: "2026-09",
          shifts: [{
            userId: Number(plan),
            startsAt: "2026-09-26T07:00:00+00:00",
            endsAt: "2026-09-26T19:00:00+00:00",
            unit: "Medicina",
          }],
        }),
      });
      setNotice("Rol mensual de turnos publicado.");
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo publicar el rol."));
    }
  }

  async function suggest(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ suggestion: { assignments: unknown[] } }>("/api/v1/staff/assignments/suggest", {
        method: "POST",
        body: JSON.stringify({
          shiftDate: "2026-09-26",
          nurseIds: nurseIds.split(",").map((id) => Number(id.trim())).filter(Boolean),
        }),
      });
      setSuggestion(JSON.stringify(data.suggestion.assignments));
      setNotice("Distribución sugerida según NEWS2 y carga de cuidados.");
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo calcular la distribución."));
    }
  }

  async function approve() {
    try {
      await api("/api/v1/staff/assignments/approve", {
        method: "POST",
        body: JSON.stringify({
          shiftDate: "2026-09-26",
          assignments: JSON.parse(suggestion || "[]"),
        }),
      });
      setNotice("Asignación diaria aprobada y notificada al personal.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo aprobar la asignación."));
    }
  }

  async function loadHandover() {
    try {
      const data = await api<{ handover: { patients: Array<{ patientName: string; news2: number | null }> } }>("/api/v1/staff/handover?shiftDate=2026-09-26");
      setHandover(data.handover.patients.map((patient) => `${patient.patientName} · NEWS2 ${patient.news2 ?? "s/d"}`).join("\n"));
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo consolidar el handover."));
    }
  }

  async function signHandover(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/v1/staff/handover", {
        method: "POST",
        body: JSON.stringify({ fromUserId: Number(fromUserId), shiftDate: "2026-09-26" }),
      });
      setNotice("Recepción de turno firmada.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo firmar el handover."));
    }
  }

  async function recordAbsence(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/v1/staff/absences", {
        method: "POST",
        body: JSON.stringify({ userId: Number(absenceUserId), shiftDate: "2026-09-26", reason: "Inasistencia" }),
      });
      setNotice("Inasistencia registrada.");
      await loadCoverage();
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la inasistencia."));
    }
  }

  const title = role === "jefatura_enfermeria"
    ? "Rol de turnos mensual y programación del servicio"
    : role === "enfermera_piso"
      ? "Entrega de turno"
      : role === "recursos_humanos"
        ? "Solicitudes de cobertura del servicio"
        : "Turnos, asignación y cobertura";

  const lead = role === "enfermera_piso"
    ? "Consolide las constantes, la medicación y las alertas del turno, y firme la recepción."
    : role === "recursos_humanos"
      ? "Valide la justificación y autorice la cobertura extraordinaria."
      : role === "jefatura_enfermeria"
        ? "Publique el rol mensual y apruebe las convocatorias de retén."
        : "Balancee la carga del turno según NEWS2 y registre las inasistencias.";

  return (
    <Sheet kicker="Gestión de personal" title={title} wide clinic="board" className="floor-care ops-board">
      <p className="lead">{lead}</p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}

      <div className={role === "enfermera_supervisora" ? "ops-split" : "ops-stack"}>
        {role === "jefatura_enfermeria" ? (
          <Panel title="Rol mensual de turnos">
            <form className="stack ops-form" onSubmit={(event) => void publish(event)}>
              <TextField id="plan-user" label="Identificador de la enfermera" value={plan} onChange={(event) => setPlan(event.target.value)} />
              <Button type="submit">Publicar rol mensual</Button>
            </form>
          </Panel>
        ) : null}

        {role === "enfermera_supervisora" ? (
          <div className="ops-stack">
            <Panel title="Asignación activa del turno">
              <form className="stack ops-form" onSubmit={(event) => void suggest(event)}>
                <TextField id="nurse-ids" label="Identificadores de enfermeras (separados por coma)" value={nurseIds} onChange={(event) => setNurseIds(event.target.value)} />
                <Button type="submit">Sugerir distribución</Button>
              </form>
              {suggestion ? (
                <div className="ops-suggestion">
                  <p className="kicker">Propuesta del turno</p>
                  <pre>{suggestion}</pre>
                  <Button type="button" onClick={() => void approve()}>Aprobar asignación</Button>
                </div>
              ) : null}
            </Panel>
            <Panel title="Registro de contingencias">
              <form className="stack ops-form" onSubmit={(event) => void recordAbsence(event)}>
                <TextField id="absence-user" label="Identificador de quien falta" value={absenceUserId} onChange={(event) => setAbsenceUserId(event.target.value)} />
                <Button type="submit">Registrar inasistencia</Button>
              </form>
            </Panel>
          </div>
        ) : null}

        {role === "enfermera_piso" ? (
          <Panel title="Entrega de turno">
            <Button type="button" onClick={() => void loadHandover()}>Consolidar handover</Button>
            {handover ? <TextAreaField id="handover" label="Resumen del turno" value={handover} readOnly /> : null}
            <form className="stack ops-form" onSubmit={(event) => void signHandover(event)}>
              <TextField id="from-user" label="Identificador de la enfermera saliente" value={fromUserId} onChange={(event) => setFromUserId(event.target.value)} />
              <Button type="submit">Firmar recepción de turno</Button>
            </form>
          </Panel>
        ) : null}

        {requests.length > 0 ? (
          <Panel title="Coberturas y retén" aside={`${requests.length} solicitud(es)`}>
            <ul className="work-queue">
              {requests.map((request) => (
                <li key={request.id} className="work-card">
                  <p>Cobertura #{request.id} · {request.status}</p>
                  {role === "jefatura_enfermeria" ? (
                    <Button type="button" onClick={() => void api(`/api/v1/staff/coverage-requests/${request.id}/approve`, { method: "POST" }).then(() => setNotice("Convocatoria de retén aprobada."))}>Aprobar retén</Button>
                  ) : null}
                  {role === "recursos_humanos" ? (
                    <Button type="button" onClick={() => void api(`/api/v1/staff/coverage-requests/${request.id}/authorize`, { method: "POST" }).then(() => setNotice("Cobertura extraordinaria autorizada."))}>Autorizar cobertura</Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </Sheet>
  );
}
