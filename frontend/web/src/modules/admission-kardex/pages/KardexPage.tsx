import { useEffect, useState } from "react";
import { IconAlertTriangle, IconCheck, IconHeartbeat, IconNotes, IconPill } from "@tabler/icons-react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { StatusPill } from "../../../shared/ui/clinical";
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

function news2Parts(label: string) {
  const match = label.match(/^(\d+)\s*puntos/i);
  const total = match ? Number(match[1]) : 0;
  return { total, text: label, pct: Math.min(100, Math.round((total / 20) * 100)) };
}

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
      <Sheet kicker="Enfermería de piso · Hoja de administración y tratamiento" title="Kardex electrónico de ingreso" wide framed clinic="board">
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

  const news = kardex ? news2Parts(kardex.news2) : null;

  return (
    <Sheet kicker="Enfermería de piso · Hoja de administración y tratamiento" title="Kardex electrónico de ingreso" wide framed clinic="board">
      <p className="lead">
        Compruebe y valide el plan terapéutico consolidado de {activeEncounter.patientName} desde la conciliación farmacéutica y las valoraciones de ingreso.
      </p>
      {kardex ? (
        <div className="kardex-board">
          <section className="kardex-card">
            <header className="kardex-card-head">
              <h3><IconAlertTriangle size={18} aria-hidden /> 1. Alergias e intolerancias verificadas</h3>
              <span>Revisión clínica</span>
            </header>
            <p className="hint">Alerta farmacológica. No administrar los siguientes activos o derivados:</p>
            {kardex.allergies.length > 0 ? (
              <ul className="allergy-chips">
                {kardex.allergies.map((item) => (
                  <li key={item}><span>{item}</span></li>
                ))}
              </ul>
            ) : (
              <p className="empty">Ninguna registrada</p>
            )}
            <p className="kardex-foot">
              Brazalete {activeEncounter.wristbandCode ?? "pendiente"}
              <StatusPill tone="info">Verificado</StatusPill>
            </p>
          </section>
          <section className="kardex-card kardex-card-news">
            <header className="kardex-card-head">
              <h3><IconHeartbeat size={18} aria-hidden /> 2. NEWS2</h3>
              <span>Basal al ingreso</span>
            </header>
            <p className="kardex-news-total">{news?.total ?? "—"}</p>
            <p>{kardex.news2}</p>
            <div className="kardex-bar" aria-hidden>
              <span style={{ width: `${news?.pct ?? 0}%` }} />
            </div>
          </section>
          <section className="kardex-card kardex-card-wide">
            <header className="kardex-card-head">
              <h3><IconPill size={18} aria-hidden /> 3. Plan de medicación activa</h3>
              <span>{kardex.medications.length} fármacos</span>
            </header>
            {kardex.medications.length > 0 ? (
              <ul className="kardex-meds">
                {kardex.medications.map((item) => (
                  <li key={item}>
                    <strong>{item}</strong>
                    <StatusPill tone="success">Activo en hospitalización</StatusPill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Ninguno registrado</p>
            )}
          </section>
          <section className="kardex-card">
            <header className="kardex-card-head">
              <h3><IconNotes size={18} aria-hidden /> 4. Valoración y constantes</h3>
            </header>
            <p><strong>Valoración.</strong> {kardex.assessment}</p>
            <p><strong>Constantes.</strong> {kardex.vitals}</p>
          </section>
          <section className="kardex-card">
            <header className="kardex-card-head">
              <h3>5. Escalas de riesgo</h3>
            </header>
            <dl className="facts facts-rows">
              <div><dt>Caídas</dt><dd>{kardex.fallRisk}</dd></div>
              <div><dt>Úlceras por presión</dt><dd>{kardex.pressureRisk}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <div className="form-actions-bar">
        <p className="hint">Validación legal y apertura de e-MAR. Al confirmar, el plan queda sellado con la credencial de {user?.name ?? "enfermería de piso"}.</p>
        <Button type="button" onClick={() => void confirmKardex()} disabled={pending || advanced}>
          <IconCheck size={18} /> Confirmar revisión del Kardex
        </Button>
      </div>
      <StepNav role={role} encounter={activeEncounter} viewingStep="kardex" canContinue={advanced} />
    </Sheet>
  );
}
