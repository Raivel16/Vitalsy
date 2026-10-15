import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { ProgressTrack, StatusPill, type ClinicalTone } from "../../../shared/ui/clinical";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { ACTION_LABEL, type DischargeCase } from "../domain/discharge";

type FilterId = "todas" | "orden" | "epicrisis" | "circuito";

type Inpatient = {
  encounterId: string;
  patientName: string;
  documentType: string;
  documentNumber: string;
  wristbandCode: string | null;
  currentStep: string;
  location: { room: string | null; bed: string | null; service: string | null };
};

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
  const [filter, setFilter] = useState<FilterId>("todas");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [inpatients, setInpatients] = useState<Inpatient[]>([]);
  const canStart = user?.role === "medico_tratante" || user?.role === "medico_residente";

  const load = useCallback(async () => {
    try {
      const path = user?.role === "camillero" ? "/api/v1/discharge/authorized-exits" : "/api/v1/discharge/board";
      const data = await api<{ cases: DischargeCase[] }>(path);
      setCases(data.cases);
      if (user?.role === "medico_tratante" || user?.role === "medico_residente") {
        const census = await api<{ encounters?: Inpatient[] }>("/api/v1/hospital-admission/encounters?per_page=50");
        setInpatients((census.encounters ?? []).filter((patient) => patient.currentStep === "cerrado"));
      }
      setError("");
    } catch (error_) {
      setError(errorText(error_, "No se pudo cargar el listado de egresos."));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => cases.filter((item) => matchesFilter(item, filter)), [cases, filter]);
  const starters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inpatients.filter((patient) => {
      if (cases.some((item) => item.encounterId === patient.encounterId)) return false;
      if (!needle) return true;
      const place = [patient.location?.room, patient.location?.bed, patient.location?.service].filter(Boolean).join(" ");
      return [patient.patientName, patient.documentNumber, patient.encounterId, patient.wristbandCode, place].join(" ").toLowerCase().includes(needle);
    });
  }, [inpatients, cases, query]);

  async function onWristbandScan(code: string) {
    const needle = code.trim().toLowerCase();
    if (!needle) return;
    let pool = inpatients;
    if (pool.length === 0) {
      try {
        const census = await api<{ encounters?: Inpatient[] }>("/api/v1/hospital-admission/encounters?per_page=50");
        pool = (census.encounters ?? []).filter((patient) => patient.currentStep === "cerrado");
        setInpatients(pool);
      } catch (error_) {
        setError(errorText(error_, "No se pudo leer el censo para ese código."));
        return;
      }
    }
    const inpatient = pool.find((patient) =>
      [patient.wristbandCode, patient.documentNumber, patient.encounterId]
        .some((value) => value?.toLowerCase() === needle),
    );
    const openCase = cases.find((item) => item.encounterId.toLowerCase() === needle);
    const encounterId = inpatient?.encounterId ?? openCase?.encounterId;
    if (!encounterId) {
      setSearch(code.trim());
      setQuery(code.trim());
      setError("No hay un paciente hospitalizado con ese código.");
      return;
    }
    setError("");
    void navigate(`/egreso/${encounterId}`);
  }

  const counts = useMemo(() => ({
    todas: cases.length,
    orden: cases.filter((item) => matchesFilter(item, "orden")).length,
    epicrisis: cases.filter((item) => matchesFilter(item, "epicrisis")).length,
    circuito: cases.filter((item) => matchesFilter(item, "circuito")).length,
  }), [cases]);

  if (loading) return <LoadingState label="Cargando egresos…" />;

  return (
    <Sheet kicker="Alta y egreso" title="Pacientes en proceso de alta" wide clinic="board" className="floor-care ops-board">
      <p className="lead">
        Gestión de altas del servicio. Continúe el entregable de su rol; trabajo social, enfermería y liquidación avanzan en paralelo.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {canStart ? (
        <form
          className="census-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
        >
          <div className="census-toolbar-row">
            <TextField
              id="discharge-search"
              label="Buscar paciente hospitalizado"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, DNI o habitación"
              hint="Solo aparecen ingresos con la admisión cerrada."
            />
            <div className="census-toolbar-actions">
              <Button type="submit">Buscar</Button>
              <BarcodeScanner onScan={(code) => void onWristbandScan(code)} />
            </div>
          </div>
        </form>
      ) : (
        <div className="ops-scan-row">
          <BarcodeScanner onScan={(code) => void onWristbandScan(code)} />
        </div>
      )}
      {canStart && starters.length > 0 ? (
        <div className="table-wrap">
        <table aria-label="Pacientes hospitalizados">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Ubicación</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {starters.map((patient) => (
              <tr key={patient.encounterId}>
                <td>
                  <strong>{patient.patientName}</strong>
                  <span className="census-patient-meta">{patient.documentType} {patient.documentNumber}</span>
                </td>
                <td>
                  {[
                    patient.location?.room ? `Habitación ${patient.location.room}` : null,
                    patient.location?.bed ? `Lecho ${patient.location.bed}` : null,
                    patient.location?.service,
                  ].filter(Boolean).join(" · ") || "Sin ubicación"}
                </td>
                <td className="col-action">
                  <Button type="button" onClick={() => void navigate(`/egreso/${patient.encounterId}`)}>
                    Iniciar proceso de alta
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : null}
      {canStart && query && starters.length === 0 ? (
        <Feedback tone="info">No hay hospitalizados que coincidan con la búsqueda.</Feedback>
      ) : null}
      <div className="ops-toolbar">
        <fieldset className="filter-pills" aria-label="Filtrar flujo por estado">
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
        </fieldset>
      </div>

      {filtered.length === 0 ? (
        <Feedback tone="info">
          {user?.role === "camillero"
            ? "Cuando Altas y caja emita el pase de salida, el traslado aparecerá aquí."
            : "Cuando el médico registre la orden de alta, el paciente aparecerá aquí con el paso que le toca."}
        </Feedback>
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
                  <div className="discharge-action">
                    <p className="kicker">Acción prioritaria</p>
                    <p className="discharge-action-title">
                      {item.nextAction ? ACTION_LABEL[item.nextAction] ?? item.nextAction : "Egreso en curso"}
                    </p>
                  </div>
                  <div className="discharge-side">
                    <ProgressTrack done={done} total={total} />
                    <div className="chip-row">
                      {item.deliverables.map((deliverable) => (
                        <StatusPill key={deliverable.id} tone={deliverable.done ? "success" : "neutral"}>
                          {deliverable.label}
                        </StatusPill>
                      ))}
                    </div>
                    <Button type="button" onClick={() => void navigate(`/egreso/${item.encounterId}`)}>
                      {total > 0 && done === total ? "Ver seguimiento" : "Continuar alta"}
                    </Button>
                  </div>
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
