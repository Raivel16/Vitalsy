import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { StatusStamp } from "../../../shared/ui/StatusStamp";

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
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudieron cargar los resultados."));
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
    } catch (caught) {
      setError(errorText(caught, "No se pudo integrar el LIS."));
    } finally {
      setSyncing(false);
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado desde el censo para integrar laboratorio." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Resultados de laboratorio">
      <p className="lead">
        El sistema consume el LIS (FHIR Observation) e integra los resultados al expediente del paciente
        {encounter ? ` ${encounter.patientName}` : ""}.
      </p>
      {loading ? <p role="status">Cargando resultados.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de integración">{notice}</Feedback> : null}
      <StatusStamp label="Origen">Integración LIS / FHIR</StatusStamp>
      {results && results.length === 0 ? (
        <Feedback tone="info">Aún no hay resultados integrados para este ingreso.</Feedback>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="stack result-block">
          {results.map((item) => (
            <li key={item.id}>
              <strong>{item.summary}</strong>
              <span className="hint">{item.externalId}{item.resultedAt ? ` · ${item.resultedAt}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <FormActions>
        <Button type="button" onClick={syncFromLis} disabled={syncing}>
          {syncing ? "Integrando…" : "Integrar desde LIS"}
        </Button>
      </FormActions>
    </Sheet>
  );
}
