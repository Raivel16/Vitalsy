import { useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback } from "../../../shared/ui/Sheet";
import { loadLevel, todayIso } from "../domain/coverage";
import { approveAssignments, suggestAssignments } from "../staffApi";
import type { NurseLoad, ProposedAssignment, StaffMember } from "../types";

/** RF-79/80: sugerencia por NEWS2, edición de la propuesta y aprobación. */
export function AssignmentPanel({ members }: { members: StaffMember[] }) {
  const [date, setDate] = useState(todayIso());
  const [selected, setSelected] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<ProposedAssignment[] | null>(null);
  const [loads, setLoads] = useState<NurseLoad[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  const nurseName = (id: number) => members.find((m) => m.id === id)?.name ?? `Personal #${id}`;
  const toggle = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  async function suggest() {
    setNotice("");
    if (!date) {
      setError("Indique la fecha del turno.");
      return;
    }
    if (selected.length === 0) {
      setError("Seleccione al menos una enfermera del turno.");
      return;
    }
    setPending(true);
    try {
      const result = await suggestAssignments(date, selected);
      setAssignments(result.assignments);
      setLoads(result.loads);
      setError("");
    } catch (error_) {
      setError(errorText(error_, "No se pudo calcular la distribución."));
    } finally {
      setPending(false);
    }
  }

  async function approve() {
    if (!assignments) return;
    setPending(true);
    try {
      await approveAssignments(date, assignments);
      setError("");
      setNotice("Asignación diaria aprobada.");
      setAssignments(null);
    } catch (error_) {
      setError(errorText(error_, "No se pudo aprobar la asignación."));
    } finally {
      setPending(false);
    }
  }

  function reassign(encounterId: string, nurseId: number) {
    setAssignments((current) =>
      current?.map((item) => (item.encounterId === encounterId ? { ...item, nurseUserId: nurseId } : item)) ?? null,
    );
  }

  return (
    <Panel title="Asignación activa del turno">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <div className="stack ops-form">
        <TextField id="assign-date" label="Fecha del turno" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <fieldset className="nurse-grid">
          <legend>Enfermeras del turno</legend>
          {members.length === 0 ? <p className="hint">No hay personal activo para asignar.</p> : null}
          {members.map((member) => (
            <CheckField
              key={member.id}
              id={`nurse-${member.id}`}
              label={member.name}
              checked={selected.includes(member.id)}
              onChange={() => toggle(member.id)}
            />
          ))}
        </fieldset>
        <Button type="button" pending={pending} onClick={() => void suggest()}>Sugerir distribución</Button>
      </div>

      {assignments ? (
        <div className="ops-suggestion">
          <p className="kicker">Propuesta del turno</p>
          {loads.length > 0 ? (
            <ul className="work-queue">
              {loads.map((load) => {
                const level = loadLevel(load.weight);
                return (
                  <li key={load.nurseId} className="work-card">
                    <p>{load.name} · {load.patients} paciente(s) · carga {load.weight}</p>
                    <StatusPill tone={level.tone}>{level.label}</StatusPill>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {assignments.length === 0 ? (
            <p className="hint">No hay pacientes hospitalizados para distribuir.</p>
          ) : (
            <table className="data-table" aria-label="Propuesta de asignación">
              <thead>
                <tr><th scope="col">Paciente</th><th scope="col">NEWS2</th><th scope="col">Enfermera</th></tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.encounterId}>
                    <td>{item.patientName ?? item.encounterId}</td>
                    <td>{item.news2Weight}</td>
                    <td>
                      <select
                        aria-label={`Enfermera de ${item.patientName ?? item.encounterId}`}
                        value={item.nurseUserId}
                        onChange={(e) => reassign(item.encounterId, Number(e.target.value))}
                      >
                        {selected.map((id) => (
                          <option key={id} value={id}>{nurseName(id)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button type="button" pending={pending} disabled={assignments.length === 0} onClick={() => void approve()}>
            Aprobar asignación
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
