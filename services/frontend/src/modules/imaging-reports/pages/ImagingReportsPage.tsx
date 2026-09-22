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

type ImagingReportRow = {
  id: number;
  externalId: string | null;
  modality: string | null;
  summary: string;
  reportedAt: string | null;
};

export function ImagingReportsPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [reports, setReports] = useState<ImagingReportRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    setLoading(true);
    setError("");
    api<{ reports: ImagingReportRow[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/imaging-reports`)
      .then((data) => {
        if (active) setReports(data.reports);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudieron cargar los informes."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ingreso]);

  async function syncFromPacs() {
    if (!ingreso) return;
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ integrated: number; reports: ImagingReportRow[] }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/imaging-reports/sync`,
        { method: "POST" },
      );
      setReports(data.reports);
      setNotice(`${data.integrated} informes integrados desde el PACS.`);
    } catch (caught) {
      setError(errorText(caught, "No se pudo integrar el PACS."));
    } finally {
      setSyncing(false);
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado desde el censo para integrar imágenes." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Informes de imágenes">
      <p className="lead">
        El sistema consume el PACS (FHIR DiagnosticReport) e integra los informes al expediente
        {encounter ? ` de ${encounter.patientName}` : ""}.
      </p>
      {loading ? <p role="status">Cargando informes.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de integración">{notice}</Feedback> : null}
      <StatusStamp label="Origen">Integración PACS / FHIR</StatusStamp>
      {reports && reports.length === 0 ? (
        <Feedback tone="info">Aún no hay informes integrados para este ingreso.</Feedback>
      ) : null}
      {reports && reports.length > 0 ? (
        <ul className="stack result-block">
          {reports.map((item) => (
            <li key={item.id}>
              <strong>{item.summary}</strong>
              <span className="hint">
                {[item.modality, item.externalId, item.reportedAt].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <FormActions>
        <Button type="button" onClick={syncFromPacs} disabled={syncing}>
          {syncing ? "Integrando…" : "Integrar desde PACS"}
        </Button>
      </FormActions>
    </Sheet>
  );
}
