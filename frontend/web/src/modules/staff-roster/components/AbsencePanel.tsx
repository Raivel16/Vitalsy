import { useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback } from "../../../shared/ui/Sheet";
import { ABSENCE_REASONS, todayIso } from "../domain/coverage";
import { recordAbsence } from "../staffApi";
import type { AbsenceResult, StaffMember } from "../types";

function resultText(result: AbsenceResult): string {
  const parts: string[] = [];
  for (const move of result.reassignments) {
    parts.push(`${move.patients} paciente(s) reasignado(s) a ${move.nurseName}`);
  }
  if (result.unassigned > 0) parts.push(`${result.unassigned} paciente(s) quedaron sin enfermera`);
  if (result.coverage.required) parts.push("Se abrió una solicitud de cobertura para la jefatura");
  return parts.length > 0 ? `Inasistencia registrada. ${parts.join(". ")}.` : "Inasistencia registrada. No tenía pacientes asignados.";
}

/** RF-84/85: registra la contingencia y muestra qué ocurrió con sus pacientes. */
export function AbsencePanel({ members, onRecorded }: { members: StaffMember[]; onRecorded: () => void }) {
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ userId?: string; reason?: string; date?: string }>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setNotice("");
    const found: typeof errors = {};
    if (!userId) found.userId = "Seleccione al colaborador.";
    if (!date) found.date = "Indique la fecha.";
    if (!reason) found.reason = "Seleccione el motivo.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    try {
      const result = await recordAbsence(Number(userId), date, reason);
      setError("");
      setNotice(resultText(result));
      setUserId("");
      setReason("");
      onRecorded();
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la inasistencia."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Registro de contingencias">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <div className="stack ops-form">
        <SelectField id="absence-user" label="Colaborador (quien falta)" value={userId} error={errors.userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Seleccione personal</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </SelectField>
        <TextField id="absence-date" label="Fecha del turno" type="date" value={date} error={errors.date} onChange={(e) => setDate(e.target.value)} />
        <SelectField id="absence-reason" label="Motivo" value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Seleccione el motivo</option>
          {ABSENCE_REASONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
        <Button type="button" pending={pending} onClick={() => void submit()}>Registrar inasistencia</Button>
      </div>
    </Panel>
  );
}
