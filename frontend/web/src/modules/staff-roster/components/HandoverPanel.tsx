import { useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback } from "../../../shared/ui/Sheet";
import { todayIso } from "../domain/coverage";
import { previewHandover, signHandover } from "../staffApi";
import type { HandoverSummary, StaffMember } from "../types";

/** RF-81/82: la entrante consolida los pacientes de la saliente y firma la recepción. */
export function HandoverPanel({ members, selfId }: { members: StaffMember[]; selfId?: number }) {
  const [date, setDate] = useState(todayIso());
  const [fromId, setFromId] = useState("");
  const [summary, setSummary] = useState<HandoverSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  const outgoing = members.filter((m) => m.id !== selfId);

  async function consolidate() {
    setNotice("");
    if (!fromId) {
      setError("Seleccione a la enfermera saliente.");
      return;
    }
    setPending(true);
    try {
      setSummary(await previewHandover(date, Number(fromId)));
      setError("");
    } catch (caught) {
      setSummary(null);
      setError(errorText(caught, "No se pudo consolidar el handover."));
    } finally {
      setPending(false);
    }
  }

  async function sign() {
    if (!summary) return;
    setPending(true);
    try {
      await signHandover(summary.fromUserId, date);
      setError("");
      setNotice("Recepción de turno firmada.");
      setSummary(null);
    } catch (caught) {
      setError(errorText(caught, "No se pudo firmar el handover."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Entrega de turno">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <div className="stack ops-form">
        <TextField id="handover-date" label="Fecha del turno" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSummary(null); }} />
        <SelectField id="handover-from" label="Enfermera saliente" value={fromId} onChange={(e) => { setFromId(e.target.value); setSummary(null); }}>
          <option value="">Seleccione personal</option>
          {outgoing.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </SelectField>
        <Button type="button" pending={pending} onClick={() => void consolidate()}>Consolidar handover</Button>
      </div>

      {summary ? (
        <div className="ops-suggestion">
          <p className="kicker">Pacientes de {summary.fromName}</p>
          {summary.patients.length === 0 ? (
            <p className="hint">La enfermera saliente no tiene pacientes asignados ese día; no hay nada que recibir.</p>
          ) : (
            <ul className="work-queue">
              {summary.patients.map((patient) => (
                <li key={patient.encounterId} className="work-card">
                  <p><strong>{patient.patientName ?? patient.encounterId}</strong> · NEWS2 {patient.news2 ?? "s/d"}</p>
                  <p className="hint">{patient.pendingDoses} dosis pendientes</p>
                  {patient.alerts.map((alert) => (
                    <p key={alert.id} className="hint">Alerta: {alert.message}</p>
                  ))}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" pending={pending} disabled={summary.patients.length === 0} onClick={() => void sign()}>
            Firmar recepción de turno
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
