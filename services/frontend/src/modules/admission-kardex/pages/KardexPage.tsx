import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";

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
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const role = user?.role ?? "enfermera_piso";
  const [kardex, setKardex] = useState<Kardex | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(ingreso));
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (!encounter) {
      if (!ingreso) setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError("");
    api<{ kardex: Kardex }>(`/api/v1/hospital-admission/kardex/${encodeURIComponent(encounter.encounterId)}`)
      .then((data) => {
        if (active) setKardex(data.kardex);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorText(caught, "No se pudo cargar el Kardex."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encounter, ingreso]);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Kardex electrónico de ingreso">
        <EmptyEncounter message="Abra un paciente desde el censo para revisar el Kardex." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function confirmKardex() {
    setPending(true);
    setError("");
    try {
      if (activeEncounter.currentStep === "kardex") {
        const next = await advanceEncounter(activeEncounter.encounterId, "kardex");
        applyEncounter(next);
      }
      setNotice("Kardex revisado.");
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo confirmar el Kardex."));
    } finally {
      setPending(false);
    }
  }

  if (loading) return <LoadingState label="Cargando Kardex…" />;
  if (error && !kardex) return <Feedback tone="error">{error}</Feedback>;

  return (
    <Sheet kicker="Enfermería" title="Kardex electrónico de ingreso">
      <p className="lead">
        Revise el resumen clínico de ingreso de {activeEncounter.patientName} antes de confirmar el Kardex.
      </p>
      {kardex ? (
        <>
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
        </>
      ) : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <FormActions align="center">
        <Button type="button" onClick={() => void confirmKardex()} disabled={pending || advanced}>
          Confirmar revisión del Kardex
        </Button>
      </FormActions>
      <StepNav role={role} encounter={activeEncounter} viewingStep="kardex" canContinue={advanced} />
    </Sheet>
  );
}
