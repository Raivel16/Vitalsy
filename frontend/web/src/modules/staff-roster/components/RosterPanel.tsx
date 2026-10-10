import { useEffect, useMemo, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { formatDate } from "../../../shared/datetime/format";
import { Button } from "../../../shared/ui/Button";
import { Panel, StatTile, StatusPill } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback } from "../../../shared/ui/Sheet";
import { todayIso } from "../domain/coverage";
import {
  type MatrixRow,
  buildRows,
  countKinds,
  monthLabel,
  shiftMonth,
  toShifts,
} from "../domain/shiftMatrix";
import { getPlan, listPlans, publishPlan } from "../staffApi";
import type { PlanSummary, PublishedPlan, StaffMember } from "../types";
import { PersonPicker } from "./PersonPicker";
import { ShiftMatrix } from "./ShiftMatrix";

/** RF-78: matriz mensual de turnos; el rol publicado y los meses anteriores permanecen visibles. */
export function RosterPanel({ members }: { members: StaffMember[] }) {
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [unit, setUnit] = useState("Medicina");
  const [plan, setPlan] = useState<PublishedPlan | null>(null);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [version, setVersion] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    listPlans()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch(() => {
        if (active) setPlans([]);
      });
    return () => {
      active = false;
    };
  }, [version]);

  useEffect(() => {
    let active = true;
    getPlan(month)
      .then((loaded) => {
        if (!active) return;
        setPlan(loaded);
        setRows(buildRows(loaded.shifts, loaded.retainers));
        setDirty(false);
        setLoadedMonth(month);
      })
      .catch(() => {
        if (!active) return;
        setPlan(null);
        setRows([]);
        setDirty(false);
        setLoadedMonth(month);
      });
    return () => {
      active = false;
    };
  }, [month, version]);

  const stats = useMemo(() => countKinds(rows), [rows]);
  const monthOptions = useMemo(() => {
    const set = new Set<string>([month, ...plans.map((item) => item.yearMonth)]);
    return [...set].sort().reverse();
  }, [month, plans]);

  function goTo(next: string) {
    setMonth(next);
    setConfirming(false);
    setError("");
    setNotice("");
  }

  function changeRows(next: MatrixRow[]) {
    setRows(next);
    setDirty(true);
    setNotice("");
  }

  function addPerson(member: StaffMember) {
    changeRows([...rows, { userId: member.id, name: member.name, email: member.email ?? null, role: member.role, cells: {} }]);
  }

  async function doPublish() {
    setPending(true);
    try {
      await publishPlan(month, toShifts(rows, month, unit.trim() || "Medicina"));
      setError("");
      setConfirming(false);
      setNotice("Rol mensual de turnos publicado.");
      setVersion((current) => current + 1);
    } catch (caught) {
      setError(errorText(caught, "No se pudo publicar el rol."));
    } finally {
      setPending(false);
    }
  }

  function requestPublish() {
    setNotice("");
    if (toShifts(rows, month, unit).length === 0) {
      setError("Marque al menos un turno antes de publicar el rol.");
      return;
    }
    setError("");
    if (plan) setConfirming(true);
    else void doPublish();
  }

  const loading = loadedMonth !== month;

  return (
    <Panel
      title="Rol mensual de turnos"
      aside={
        plan ? (
          <StatusPill tone="success">Publicado</StatusPill>
        ) : (
          <StatusPill tone="warning">Sin publicar</StatusPill>
        )
      }
    >
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}

      <div className="roster-nav">
        <Button type="button" variant="quiet" aria-label="Mes anterior" onClick={() => goTo(shiftMonth(month, -1))}>‹</Button>
        <SelectField id="roster-month" label="Mes" value={month} onChange={(e) => goTo(e.target.value)}>
          {monthOptions.map((option) => (
            <option key={option} value={option}>{monthLabel(option)}</option>
          ))}
        </SelectField>
        <Button type="button" variant="quiet" aria-label="Mes siguiente" onClick={() => goTo(shiftMonth(month, 1))}>›</Button>
        <p className="hint roster-status">
          {plan
            ? `Publicado el ${formatDate(plan.publishedAt)}${plan.publishedByName ? ` por ${plan.publishedByName}` : ""}.`
            : `Aún no hay un rol publicado para ${monthLabel(month)}.`}
          {dirty ? " Tiene cambios sin publicar." : ""}
        </p>
      </div>

      <div className="roster-stats">
        <StatTile label="Personal en el rol" value={stats.staff} />
        <StatTile label="Turnos diurnos" value={stats.day} />
        <StatTile label="Turnos de noche" value={stats.night} />
      </div>

      <div className="stack ops-form roster-tools">
        <PersonPicker
          id="roster-person"
          label="Agregar colaborador"
          members={members}
          excludeIds={rows.map((row) => row.userId)}
          onPick={addPerson}
        />
        <TextField id="roster-unit" label="Servicio" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </div>

      {loading ? (
        <LoadingState label="Cargando el rol del mes…" />
      ) : (
        <ShiftMatrix
          yearMonth={month}
          rows={rows}
          onChange={changeRows}
          onRemove={(userId) => changeRows(rows.filter((row) => row.userId !== userId))}
        />
      )}

      {confirming ? (
        <div role="alertdialog" aria-label="Confirmar reemplazo" className="banner banner-warning">
          <p>Publicar reemplaza el rol de {monthLabel(month)} que ya estaba publicado. ¿Desea continuar?</p>
          <div className="actions">
            <Button type="button" pending={pending} onClick={() => void doPublish()}>Confirmar reemplazo</Button>
            <Button type="button" variant="quiet" onClick={() => setConfirming(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <Button type="button" pending={pending} onClick={requestPublish}>Publicar rol mensual oficial</Button>
        </div>
      )}
    </Panel>
  );
}
