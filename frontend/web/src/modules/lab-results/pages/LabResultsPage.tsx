import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";

type LabResultRow = {
  id: number;
  externalId: string | null;
  summary: string;
  resultedAt: string | null;
};

export function LabResultsPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [results, setResults] = useState<LabResultRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    setLoading(true);
    setError("");
    api<{ results: LabResultRow[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/lab-results`)
      .then((data) => {
        if (active) setResults(data.results);
      })
      .catch((error_) => {
        if (active) setError(errorText(error_, "No se pudieron cargar los resultados."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ingreso]);

  async function syncFromLis() {
    if (!ingreso) return;
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ integrated: number; results: LabResultRow[] }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/lab-results/sync`,
        { method: "POST" },
      );
      setResults(data.results);
      setNotice(`${data.integrated} resultados integrados desde el LIS.`);
    } catch (error_) {
      setError(errorText(error_, "No se pudo integrar el LIS."));
    } finally {
      setSyncing(false);
    }
  }

  if (!ingreso) {
    return (
      <Sheet kicker="Paraclínicos · LIS" title="Resultados de laboratorio" wide clinic="file" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado desde el censo para integrar laboratorio." />
      </Sheet>
    );
  }

  return (
    <Sheet
      kicker="Paraclínicos · LIS"
      title="Resultados de laboratorio"
      wide
      clinic="file"
      className="floor-care"
      aside={(
        <Button type="button" onClick={syncFromLis} disabled={syncing}>
          {syncing ? "Integrando…" : "Integrar desde LIS"}
        </Button>
      )}
    >
      <p className="lead">
        Paneles integrados desde el LIS (FHIR Observation) para el expediente
        {encounter ? ` de ${encounter.patientName}` : ""}.
      </p>
      {loading ? <LoadingState label="Cargando resultados…" /> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de integración">{notice}</Feedback> : null}
      <Feedback tone="info" label="Origen">Integración LIS / FHIR</Feedback>
      {results?.length === 0 ? (
        <Feedback tone="info">Aún no hay resultados integrados para este ingreso.</Feedback>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="note-feed-list" aria-label="Resultados de laboratorio">
          {results.map((item) => (
            <li key={item.id} className="note-card">
              <p className="note-card-body">{item.summary}</p>
              <p className="note-card-meta">
                <span>{item.externalId ?? "Sin ID externo"}</span>
                {item.resultedAt ? <span>{item.resultedAt}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </Sheet>
  );
}
