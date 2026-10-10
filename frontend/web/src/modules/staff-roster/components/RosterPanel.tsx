import { useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback } from "../../../shared/ui/Sheet";
import { type ShiftKind, shiftWindow, todayIso, yearMonthOf } from "../domain/coverage";
import { getPlan, publishPlan } from "../staffApi";
import type { PlannedShift, StaffMember } from "../types";

type Draft = { userId: number; date: string; kind: ShiftKind; unit: string };

const KIND_LABEL: Record<ShiftKind, string> = { dia: "Día (07:00–19:00)", noche: "Noche (19:00–07:00)" };

/** RF-78: la jefatura arma el rol del mes (varios turnos) y lo publica de una vez. */
export function RosterPanel({ members }: { members: StaffMember[] }) {
  const [date, setDate] = useState(todayIso());
  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState<ShiftKind>("dia");
  const [unit, setUnit] = useState("Medicina");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [published, setPublished] = useState<PlannedShift[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const yearMonth = yearMonthOf(date);

  useEffect(() => {
    let active = true;
    getPlan(yearMonth)
      .then((shifts) => {
        if (active) setPublished(shifts);
      })
      .catch(() => {
        if (active) setPublished([]);
      });
    return () => {
      active = false;
    };
  }, [yearMonth, notice]);

  const nameOf = (id: number) => members.find((m) => m.id === id)?.name ?? `Personal #${id}`;

  function addShift() {
    setNotice("");
    if (!userId) {
      setError("Seleccione al colaborador del turno.");
      return;
    }
    if (!date) {
      setError("Indique la fecha del turno.");
      return;
    }
    setError("");
    setDrafts((current) => [...current, { userId: Number(userId), date, kind, unit: unit.trim() || "Medicina" }]);
  }

  async function publish() {
    setNotice("");
    if (drafts.length === 0) {
      setError("Agregue al menos un turno antes de publicar.");
      return;
    }
    setPending(true);
    try {
      await publishPlan(
        yearMonth,
        drafts.map((d) => ({ userId: d.userId, unit: d.unit, ...shiftWindow(d.date, d.kind) })),
      );
      setDrafts([]);
      setError("");
      setNotice("Rol mensual de turnos publicado.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo publicar el rol."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Rol mensual de turnos" aside={`Mes ${yearMonth}`}>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <div className="stack ops-form">
        <TextField id="plan-date" label="Fecha del turno" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <SelectField id="plan-user" label="Colaborador" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Seleccione personal</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </SelectField>
        <SelectField id="plan-kind" label="Turno" value={kind} onChange={(e) => setKind(e.target.value as ShiftKind)}>
          <option value="dia">{KIND_LABEL.dia}</option>
          <option value="noche">{KIND_LABEL.noche}</option>
        </SelectField>
        <TextField id="plan-unit" label="Servicio" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <Button type="button" variant="quiet" onClick={addShift}>Agregar turno</Button>
      </div>

      {drafts.length > 0 ? (
        <table className="data-table" aria-label="Turnos por publicar">
          <thead>
            <tr><th scope="col">Fecha</th><th scope="col">Colaborador</th><th scope="col">Turno</th><th scope="col">Servicio</th></tr>
          </thead>
          <tbody>
            {drafts.map((draft, index) => (
              <tr key={`${draft.userId}-${draft.date}-${index}`}>
                <td>{draft.date}</td><td>{nameOf(draft.userId)}</td><td>{KIND_LABEL[draft.kind]}</td><td>{draft.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div className="actions">
        <Button type="button" pending={pending} onClick={() => void publish()}>Publicar rol mensual</Button>
      </div>
      <p className="hint">
        {published.length > 0
          ? `El mes ${yearMonth} tiene ${published.length} turno(s) publicado(s). Publicar de nuevo reemplaza el rol completo del mes.`
          : `Aún no hay un rol publicado para ${yearMonth}.`}
      </p>
    </Panel>
  );
}
