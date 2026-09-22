import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

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
    return <EmptyEncounter message="Abra un paciente hospitalizado desde el censo para la visita médica." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Visita médica" wide>
      <p className="lead">
        Consolida laboratorio, imágenes y notas de enfermería del día
        {encounter ? ` para ${encounter.patientName}` : ""}.
      </p>
      {loading ? <p role="status">Cargando visita.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {board ? (
        <div className="stack">
          <p className="hint">Día clínico: {board.day}</p>
          <section className="result-block" aria-label="Laboratorio">
            <h3>Laboratorio</h3>
            {board.labResults.length === 0 ? (
              <Feedback tone="info">Sin resultados de laboratorio en el día. <Link to={`/atencion/laboratorio?ingreso=${encodeURIComponent(ingreso)}`}>Integrar LIS</Link></Feedback>
            ) : (
              <ul>
                {board.labResults.map((item) => (
                  <li key={item.id}><strong>{item.summary}</strong></li>
                ))}
              </ul>
            )}
          </section>
          <section className="result-block" aria-label="Imágenes">
            <h3>Imágenes</h3>
            {board.imagingReports.length === 0 ? (
              <Feedback tone="info">Sin informes de imágenes en el día. <Link to={`/atencion/imagenes?ingreso=${encodeURIComponent(ingreso)}`}>Integrar PACS</Link></Feedback>
            ) : (
              <ul>
                {board.imagingReports.map((item) => (
                  <li key={item.id}><strong>{item.summary}</strong>{item.modality ? <span className="hint"> · {item.modality}</span> : null}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="result-block" aria-label="Notas de enfermería">
            <h3>Notas de enfermería del día</h3>
            {board.nursingNotes.length === 0 ? (
              <Feedback tone="info">Aún no hay notas de enfermería registradas hoy.</Feedback>
            ) : (
              <ul>
                {board.nursingNotes.map((item) => (
                  <li key={item.id}>
                    <strong>{item.body}</strong>
                    {item.authorName ? <span className="hint"> · {item.authorName}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}
