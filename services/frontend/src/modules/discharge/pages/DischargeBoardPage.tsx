import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { ProgressTrack, StatusPill, type ClinicalTone } from "../../../shared/ui/clinical";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { ACTION_LABEL, type DischargeCase } from "../domain/discharge";

type FilterId = "todas" | "orden" | "epicrisis" | "circuito";

function caseTone(item: DischargeCase): ClinicalTone {
  const done = item.deliverables.filter((d) => d.done).length;
  const total = item.deliverables.length;
  if (total > 0 && done === total) return "success";
  if (item.nextAction === "order") return "info";
  if (item.nextAction === "epicrisis" || item.nextAction === "prescriptions") return "warning";
  return "neutral";
}

function matchesFilter(item: DischargeCase, filter: FilterId): boolean {
  if (filter === "todas") return true;
  if (filter === "orden") return !item.order || item.nextAction === "order";
  if (filter === "epicrisis") return Boolean(item.order) && (!item.epicrisis || item.nextAction === "epicrisis" || item.nextAction === "prescriptions");
  return Boolean(item.order) && Boolean(item.epicrisis);
}

export function DischargeBoardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<DischargeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [filter, setFilter] = useState<FilterId>("todas");

  const load = useCallback(async () => {
    try {
      const path = user?.role === "camillero" ? "/api/v1/discharge/authorized-exits" : "/api/v1/discharge/board";
      const data = await api<{ cases: DischargeCase[] }>(path);
      setCases(data.cases);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo cargar el listado de egresos."));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => cases.filter((item) => matchesFilter(item, filter)), [cases, filter]);

  const counts = useMemo(() => ({
    todas: cases.length,
    orden: cases.filter((item) => matchesFilter(item, "orden")).length,
    epicrisis: cases.filter((item) => matchesFilter(item, "epicrisis")).length,
    circuito: cases.filter((item) => matchesFilter(item, "circuito")).length,
  }), [cases]);

  if (loading) return <LoadingState label="Cargando egresos…" />;

  return (
    <Sheet kicker="Alta y egreso" title="Pacientes en proceso de alta" wide>
      <p className="lead">
        Continúe el entregable que corresponde a su perfil. La valoración social y la conciliación de enfermería pueden
        avanzar en paralelo.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <form
        className="stack discharge-open"
        onSubmit={(event) => {
          event.preventDefault();
          if (!encounterId.trim()) {
            setError("Indique el ingreso que desea abrir.");
            return;
          }
          void navigate(`/egreso/${encodeURIComponent(encounterId.trim())}`);
        }}
      >
        <TextField
          id="discharge-encounter"
          label="Abrir ficha de egreso"
          value={encounterId}
          onChange={(event) => setEncounterId(event.target.value)}
        />
        <Button type="submit">Abrir ficha</Button>
      </form>

      <div className="filter-pills" role="group" aria-label="Filtrar flujo por estado">
        {(
          [
            ["todas", `Todas ${counts.todas}`],
            ["orden", `Pendiente orden médica ${counts.orden}`],
            ["epicrisis", `Pendiente epicrisis ${counts.epicrisis}`],
            ["circuito", `En circuito de egreso ${counts.circuito}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`filter-pill${filter === id ? " is-active" : ""}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Feedback tone="info">No hay egresos pendientes para su perfil.</Feedback>
      ) : (
        <ul className="discharge-board">
          {filtered.map((item) => {
            const done = item.deliverables.filter((deliverable) => deliverable.done).length;
            const total = item.deliverables.length;
            const tone = caseTone(item);
            return (
              <li key={item.encounterId} className="discharge-card">
                <div className="discharge-card-head">
                  <div>
                    <h3>{item.patientName}</h3>
                    <p className="hint">{item.location ?? "Ubicación no registrada"}</p>
                  </div>
                  <StatusPill tone={tone}>
                    {done} de {total} listos
                  </StatusPill>
                </div>
                <div className="discharge-card-body">
                  <div>
                    <p className="kicker">Acción prioritaria</p>
                    <p>
                      {item.nextAction ? ACTION_LABEL[item.nextAction] ?? item.nextAction : "Egreso en curso"}
                    </p>
                  </div>
                  <ProgressTrack done={done} total={total} />
                  <div className="chip-row">
                    {item.deliverables.map((deliverable) => (
                      <StatusPill key={deliverable.id} tone={deliverable.done ? "success" : "neutral"}>
                        {deliverable.label}
                      </StatusPill>
                    ))}
                  </div>
                  <Button type="button" onClick={() => void navigate(`/egreso/${item.encounterId}`)}>
                    Continuar
                  </Button>
                </div>
                <p className="sr-only">
                  {done} de {total} entregables listos
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
