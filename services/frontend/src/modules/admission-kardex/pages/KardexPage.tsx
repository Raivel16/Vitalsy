import { useEffect, useState } from "react";
import { api } from "../../../app/api";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type Kardex = {
  patientName: string;
  assessment: string;
  allergies: string[];
  medications: string[];
  vitals: string;
  news2: string;
  fallRisk: string;
  pressureRisk: string;
};

export function KardexPage() {
  const [kardex, setKardex] = useState<Kardex | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<{ kardex: Kardex }>("/api/v1/hospital-admission/kardex/ENC-0001")
      .then((data) => {
        if (active) setKardex(data.kardex);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "No se pudo cargar el Kardex.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p role="status">Cargando Kardex de ingreso.</p>;
  if (error || !kardex) return <Feedback tone="error">{error || "Kardex no disponible."}</Feedback>;

  return (
    <Sheet kicker="Enfermería" title="Kardex electrónico de ingreso">
      <h3>{kardex.patientName}</h3>
      <dl className="facts">
        <div><dt>Valoración</dt><dd>{kardex.assessment}</dd></div>
        <div><dt>Alergias</dt><dd>{kardex.allergies.join(", ")}</dd></div>
        <div><dt>Medicamentos</dt><dd>{kardex.medications.join(", ")}</dd></div>
        <div><dt>Constantes</dt><dd>{kardex.vitals}</dd></div>
        <div><dt>NEWS2</dt><dd>{kardex.news2}</dd></div>
        <div><dt>Caídas</dt><dd>{kardex.fallRisk}</dd></div>
        <div><dt>Úlceras por presión</dt><dd>{kardex.pressureRisk}</dd></div>
      </dl>
    </Sheet>
  );
}
