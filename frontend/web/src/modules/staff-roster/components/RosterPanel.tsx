import { useEffect, useMemo, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { formatDate } from "../../../shared/datetime/format";
import { Button } from "../../../shared/ui/Button";
import { Panel, StatTile, StatusPill } from "../../../shared/ui/clinical";
import { SelectField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback } from "../../../shared/ui/Sheet";
import { SERVICES, todayIso } from "../domain/coverage";
import { orderMonthOptions } from "../domain/months";
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

function planStatusPill(loading: boolean, published: boolean) {
  if (loading) return undefined;
  return published ? <StatusPill tone="success">Publicado</StatusPill> : <StatusPill tone="warning">Sin publicar</StatusPill>;
}

function planStatusText(plan: PublishedPlan | null, month: string): string {
  if (!plan) return `Aún no hay un rol publicado para ${monthLabel(month)}.`;
  const author = plan.publishedByName ? " por " + plan.publishedByName : "";
  return `Publicado el ${formatDate(plan.publishedAt)}${author}.`;
}

/** RF-78: matriz mensual de turnos; el rol publicado y los meses anteriores permanecen visibles. */
export function RosterPanel({ members }: Readonly<{ members: StaffMember[] }>) {
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [unit, setUnit] = useState<string>(SERVICES[0]);
  const [plan, setPlan] = useState<PublishedPlan | null>(null);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [version, setVersion] = useState(0);
  const [candidate, setCandidate] = useState<StaffMember | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Mientras llega el mes elegido, plan y matriz siguen siendo los del mes anterior: no se muestran ni se publican.
  const loading = loadedMonth !== month;

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
        const published = loaded.shifts.find((shift) => shift.unit);
        if (published?.unit) setUnit(published.unit);
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
  const monthOptions = useMemo(() => orderMonthOptions(month, plans), [month, plans]);
  const serviceOptions = useMemo(() => (SERVICES.includes(unit as (typeof SERVICES)[number]) ? [...SERVICES] : [unit, ...SERVICES]), [unit]);

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

  function addCandidate() {
    if (!candidate) {
      setError("Busque y elija a la persona antes de agregarla al rol.");
      return;
    }
    setError("");
    changeRows([
      ...rows,
      { userId: candidate.id, name: candidate.name, email: candidate.email ?? null, role: candidate.role, cells: {} },
    ]);
    setCandidate(null);
  }

  async function doPublish() {
    setPending(true);
    try {
      await publishPlan(month, toShifts(rows, month, unit));
      setError("");
      setConfirming(false);
      setNotice("Rol mensual de turnos publicado.");
      setVersion((current) => current + 1);
    } catch (error_) {
      setError(errorText(error_, "No se pudo publicar el rol."));
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

  return (
    <>
      <Panel title="Agregar colaborador al rol">
        <div className="roster-add">
          <PersonPicker
            id="roster-person"
            label="Colaborador"
            members={members}
            excludeIds={rows.map((row) => row.userId)}
            selected={candidate}
            onPick={setCandidate}
            onClear={() => setCandidate(null)}
          />
          <Button type="button" onClick={addCandidate}>Agregar al rol</Button>
        </div>
        <p className="hint">Busque por nombre, correo o rol. Al agregarlo aparece como una fila de la matriz para marcar sus turnos.</p>
      </Panel>

      <Panel
        title="Rol mensual de turnos"
        aside={planStatusPill(loading, Boolean(plan))}
      >
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {notice ? <Feedback tone="success">{notice}</Feedback> : null}

        <div className="roster-nav">
          <div className="roster-month">
            <Button type="button" variant="quiet" aria-label="Mes anterior" onClick={() => goTo(shiftMonth(month, -1))}>‹</Button>
            <SelectField id="roster-month" label="Mes" hideLabel value={month} onChange={(e) => goTo(e.target.value)}>
              {monthOptions.map((option) => (
                <option key={option} value={option}>{monthLabel(option)}</option>
              ))}
            </SelectField>
            <Button type="button" variant="quiet" aria-label="Mes siguiente" onClick={() => goTo(shiftMonth(month, 1))}>›</Button>
          </div>
          <SelectField
            id="roster-unit"
            label="Servicio del rol"
            hint="Unidad a la que pertenecen estos turnos; el relevo exige el mismo servicio."
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              setDirty(true);
            }}
          >
            {serviceOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </SelectField>
        </div>
        <p className="hint roster-status">
          {loading ? "" : planStatusText(plan, month)}
          {dirty && !loading ? " Tiene cambios sin publicar." : ""}
        </p>

        <div className="roster-stats">
          <StatTile label="Personal en el rol" value={stats.staff} />
          <StatTile label="Turnos diurnos" value={stats.day} />
          <StatTile label="Turnos de noche" value={stats.night} />
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
          <div role="alertdialog" aria-label="Confirmar reemplazo" className="banner banner-warning roster-publish">
            <p>Publicar reemplaza el rol de {monthLabel(month)} que ya estaba publicado. ¿Desea continuar?</p>
            <div className="actions">
              <Button type="button" pending={pending} onClick={() => void doPublish()}>Confirmar reemplazo</Button>
              <Button type="button" variant="quiet" onClick={() => setConfirming(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="actions roster-publish">
            <Button type="button" pending={pending} disabled={loading} onClick={requestPublish}>Publicar rol mensual oficial</Button>
          </div>
        )}
      </Panel>
    </>
  );
}
