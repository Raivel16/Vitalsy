import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { formatDate } from "../../../shared/datetime/format";
import { VitalSignsChartPanel } from "../../vital-monitoring/ui/VitalSignsChartPanel";

type VisitBoard = {
  day: string;
  labResults: Array<{ id: number; summary: string; externalId: string | null }>;
  imagingReports: Array<{ id: number; summary: string; modality: string | null; externalId: string | null }>;
  nursingNotes: Array<{ id: number; body: string; authorName: string | null }>;
};

export function ClinicalVisitPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [board, setBoard] = useState<VisitBoard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    setLoading(true);
    setError("");
    api<VisitBoard>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/clinical-visit`)
      .then((data) => {
        if (active) setBoard(data);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo abrir la visita consolidada."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ingreso]);

  if (!ingreso) {
    return (
      <Sheet kicker="Pase de visita" title="Visita médica" wide clinic="file" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado desde el censo para la visita médica." />
      </Sheet>
    );
  }

  return (
    <Sheet kicker="Pase de visita" title="Visita médica" wide clinic="file" className="floor-care">
      <p className="lead">
        Resultados del día, notas de enfermería y gráfica de signos vitales
        {encounter ? ` de ${encounter.patientName}` : ""}.
      </p>
      {loading ? <LoadingState label="Cargando visita…" /> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <VitalSignsChartPanel encounterId={ingreso} />
      {board ? (
        <div className="stack">
          <p className="day-label">Día clínico: {formatDate(board.day)}</p>
          <section className="result-block" aria-label="Laboratorio">
            <h3>Laboratorio</h3>
            {board.labResults.length === 0 ? (
              <Feedback tone="info">Sin resultados de laboratorio en el día. <Link to={`/atencion/laboratorio?ingreso=${encodeURIComponent(ingreso)}`}>Integrar LIS</Link></Feedback>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Resumen</th></tr></thead>
                  <tbody>
                    {board.labResults.map((item) => (
                      <tr key={item.id}><td>{item.summary}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="result-block" aria-label="Imágenes">
            <h3>Imágenes</h3>
            {board.imagingReports.length === 0 ? (
              <Feedback tone="info">Sin informes de imágenes en el día. <Link to={`/atencion/imagenes?ingreso=${encodeURIComponent(ingreso)}`}>Integrar PACS</Link></Feedback>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Resumen</th><th>Modalidad</th></tr></thead>
                  <tbody>
                    {board.imagingReports.map((item) => (
                      <tr key={item.id}>
                        <td>{item.summary}</td>
                        <td>{item.modality ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="result-block" aria-label="Notas de enfermería">
            <h3>Notas de enfermería del día</h3>
            {board.nursingNotes.length === 0 ? (
              <Feedback tone="info">Aún no hay notas de enfermería registradas hoy.</Feedback>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nota</th><th>Autor</th></tr></thead>
                  <tbody>
                    {board.nursingNotes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.body}</td>
                        <td>{item.authorName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}
