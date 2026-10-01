import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { IconCheck, IconWalk } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { SelectField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { StatusPill } from "../../../shared/ui/clinical";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { calculateBraden, type BradenFriction, type BradenScore4 } from "../domain/bradenScale";
import { calculateMorse } from "../domain/morseFallScale";

const BRADEN_LABELS: Record<string, Record<number, string>> = {
  sensory: { 1: "1 — Completamente limitada", 2: "2 — Muy limitada", 3: "3 — Ligeramente limitada", 4: "4 — Sin limitación" },
  moisture: { 1: "1 — Constantemente húmeda", 2: "2 — Muy húmeda", 3: "3 — Ocasionalmente húmeda", 4: "4 — Raramente húmeda" },
  activity: { 1: "1 — Encamado", 2: "2 — En silla", 3: "3 — Deambula ocasionalmente", 4: "4 — Deambula con frecuencia" },
  mobility: { 1: "1 — Completamente inmóvil", 2: "2 — Muy limitada", 3: "3 — Ligeramente limitada", 4: "4 — Sin limitación" },
  nutrition: { 1: "1 — Muy pobre", 2: "2 — Probablemente inadecuada", 3: "3 — Adecuada", 4: "4 — Excelente" },
  friction: { 1: "1 — Problema", 2: "2 — Problema potencial", 3: "3 — No hay problema aparente" },
};

export function RiskScalesPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const [historyOfFalling, setHistoryOfFalling] = useState(false);
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState(false);
  const [ambulatoryAid, setAmbulatoryAid] = useState<"none" | "device" | "furniture">("none");
  const [intravenousAccess, setIntravenousAccess] = useState(false);
  const [gait, setGait] = useState<"normal" | "weak" | "impaired">("normal");
  const [mentalStatus, setMentalStatus] = useState<"oriented" | "overestimates">("oriented");
  const [braden, setBraden] = useState({
    sensoryPerception: 4 as BradenScore4,
    moisture: 4 as BradenScore4,
    activity: 4 as BradenScore4,
    mobility: 4 as BradenScore4,
    nutrition: 4 as BradenScore4,
    frictionShear: 3 as BradenFriction,
  });
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const morse = useMemo(
    () => calculateMorse({ historyOfFalling, secondaryDiagnosis, ambulatoryAid, intravenousAccess, gait, mentalStatus }),
    [ambulatoryAid, gait, historyOfFalling, intravenousAccess, mentalStatus, secondaryDiagnosis],
  );
  const pressure = useMemo(() => calculateBraden(braden), [braden]);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería de piso · Valoración protocolar" title="Escalas de riesgo" wide framed clinic="board">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar las escalas." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await api("/api/v1/hospital-admission/risk-scales", {
        method: "POST",
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          morse: {
            historyOfFalling,
            secondaryDiagnosis,
            ambulatoryAid,
            intravenousAccess,
            gait,
            mentalStatus,
          },
          braden,
        }),
      });
      setSaved("Escalas registradas.");
      setError("");
      if (activeEncounter.currentStep === "escalas") {
        const next = await advanceEncounter(activeEncounter.encounterId, "escalas");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudieron registrar las escalas."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Enfermería de piso · Valoración protocolar" title="Escalas de riesgo" wide framed clinic="board">
      <p className="lead">
        Evaluación obligatoria de riesgo de caídas y úlceras por presión de {activeEncounter.patientName} para determinar los cuidados de enfermería basales.
      </p>
      <form className="stack nursing-form" onSubmit={onSubmit}>
        <fieldset className="risk-card">
          <legend className="sr-only">Escala de Morse</legend>
          <header className="risk-card-head">
            <div>
              <h3><IconWalk size={18} aria-hidden /> 1. Escala Morse (riesgo de caídas)</h3>
              <p className="hint">Estratificación continua durante la hospitalización</p>
            </div>
            <div className="risk-score">
              <span className="hint">Puntaje calculado</span>
              <strong>{morse.total} pts</strong>
              <StatusPill tone={morse.level === "high" ? "danger" : morse.level === "moderate" ? "warning" : "success"}>
                {morse.levelLabel}
              </StatusPill>
            </div>
          </header>
          <ScaleRow id="q-falls" title="Antecedentes de caídas (últimos 3 meses)" hint="¿Se ha caído antes del ingreso hospitalario?">
            <label className={!historyOfFalling ? "is-selected" : undefined}><input type="radio" name="falls" checked={!historyOfFalling} onChange={() => setHistoryOfFalling(false)} aria-label="Antecedente de caídas: no" /> No (0 pts)</label>
            <label className={historyOfFalling ? "is-selected" : undefined}><input type="radio" name="falls" checked={historyOfFalling} onChange={() => setHistoryOfFalling(true)} aria-label="Antecedente de caídas: sí" /> Sí (25 pts)</label>
          </ScaleRow>
          <ScaleRow id="q-dx" title="Diagnóstico secundario" hint="Más de un diagnóstico activo en la historia clínica.">
            <label className={!secondaryDiagnosis ? "is-selected" : undefined}><input type="radio" name="dx" checked={!secondaryDiagnosis} onChange={() => setSecondaryDiagnosis(false)} aria-label="Diagnóstico secundario: no" /> No (0 pts)</label>
            <label className={secondaryDiagnosis ? "is-selected" : undefined}><input type="radio" name="dx" checked={secondaryDiagnosis} onChange={() => setSecondaryDiagnosis(true)} aria-label="Diagnóstico secundario: sí" /> Sí (15 pts)</label>
          </ScaleRow>
          <ScaleRow id="q-aid" title="Ayuda para deambular" hint="Uso de soportes de marcha, muletas o apoyo físico.">
            <label className={ambulatoryAid === "none" ? "is-selected" : undefined}><input type="radio" name="aid" checked={ambulatoryAid === "none"} onChange={() => setAmbulatoryAid("none")} /> Ninguna / reposo (0 pts)</label>
            <label className={ambulatoryAid === "device" ? "is-selected" : undefined}><input type="radio" name="aid" checked={ambulatoryAid === "device"} onChange={() => setAmbulatoryAid("device")} /> Muletas / bastón (15 pts)</label>
            <label className={ambulatoryAid === "furniture" ? "is-selected" : undefined}><input type="radio" name="aid" checked={ambulatoryAid === "furniture"} onChange={() => setAmbulatoryAid("furniture")} /> Se apoya en muebles (30 pts)</label>
          </ScaleRow>
          <ScaleRow id="q-iv" title="Vía endovenosa / catéter heparinizado" hint="Presencia de perfusión o acceso venoso activo.">
            <label className={!intravenousAccess ? "is-selected" : undefined}><input type="radio" name="iv" checked={!intravenousAccess} onChange={() => setIntravenousAccess(false)} aria-label="Vía intravenosa: no" /> No (0 pts)</label>
            <label className={intravenousAccess ? "is-selected" : undefined}><input type="radio" name="iv" checked={intravenousAccess} onChange={() => setIntravenousAccess(true)} aria-label="Vía intravenosa: sí" /> Sí (20 pts)</label>
          </ScaleRow>
          <ScaleRow id="q-gait" title="Marcha / traslado" hint="Calidad del paso, zancada y equilibrio al incorporarse.">
            <label className={gait === "normal" ? "is-selected" : undefined}><input type="radio" name="gait" checked={gait === "normal"} onChange={() => setGait("normal")} aria-label="Marcha: normal" /> Normal / inmóvil (0 pts)</label>
            <label className={gait === "weak" ? "is-selected" : undefined}><input type="radio" name="gait" checked={gait === "weak"} onChange={() => setGait("weak")} aria-label="Marcha: débil" /> Débil (10 pts)</label>
            <label className={gait === "impaired" ? "is-selected" : undefined}><input type="radio" name="gait" checked={gait === "impaired"} onChange={() => setGait("impaired")} aria-label="Marcha: alterada" /> Alterada (20 pts)</label>
          </ScaleRow>
          <ScaleRow id="q-mental" title="Estado mental" hint="Autopercepción de la propia capacidad física.">
            <label className={mentalStatus === "oriented" ? "is-selected" : undefined}><input type="radio" name="mental" checked={mentalStatus === "oriented"} onChange={() => setMentalStatus("oriented")} aria-label="Conoce sus límites" /> Conoce sus límites (0 pts)</label>
            <label className={mentalStatus === "overestimates" ? "is-selected" : undefined}><input type="radio" name="mental" checked={mentalStatus === "overestimates"} onChange={() => setMentalStatus("overestimates")} aria-label="Sobreestima o olvida límites" /> Olvida limitaciones (15 pts)</label>
          </ScaleRow>
          <div className="nursing-banner" role="status" aria-label="Resultado de caídas">
            {morse.total} puntos. {morse.levelLabel}. {morse.recommendations.join(" ")}
          </div>
        </fieldset>
        <fieldset className="risk-card">
          <legend className="sr-only">Escala de Braden</legend>
          <header className="risk-card-head">
            <div>
              <h3>2. Escala Braden (riesgo de úlceras por presión)</h3>
              <p className="hint">Valoración basal para plan de rotación y protección</p>
            </div>
            <div className="risk-score">
              <span className="hint">Puntaje calculado</span>
              <strong>{pressure.total} pts</strong>
              <StatusPill tone={pressure.level === "none" || pressure.level === "mild" ? "success" : pressure.level === "moderate" ? "warning" : "danger"}>
                {pressure.levelLabel}
              </StatusPill>
            </div>
          </header>
          <div className="braden-grid">
            <ScoreSelect id="sensory" label="Percepción sensorial" max={4} value={braden.sensoryPerception} labels={BRADEN_LABELS.sensory} onChange={(value) => setBraden({ ...braden, sensoryPerception: value as BradenScore4 })} />
            <ScoreSelect id="moisture" label="Humedad" max={4} value={braden.moisture} labels={BRADEN_LABELS.moisture} onChange={(value) => setBraden({ ...braden, moisture: value as BradenScore4 })} />
            <ScoreSelect id="activity" label="Actividad" max={4} value={braden.activity} labels={BRADEN_LABELS.activity} onChange={(value) => setBraden({ ...braden, activity: value as BradenScore4 })} />
            <ScoreSelect id="mobility" label="Movilidad" max={4} value={braden.mobility} labels={BRADEN_LABELS.mobility} onChange={(value) => setBraden({ ...braden, mobility: value as BradenScore4 })} />
            <ScoreSelect id="nutrition" label="Nutrición" max={4} value={braden.nutrition} labels={BRADEN_LABELS.nutrition} onChange={(value) => setBraden({ ...braden, nutrition: value as BradenScore4 })} />
            <ScoreSelect id="friction" label="Fricción y cizallamiento" max={3} value={braden.frictionShear} labels={BRADEN_LABELS.friction} onChange={(value) => setBraden({ ...braden, frictionShear: value as BradenFriction })} />
          </div>
          <div className="nursing-banner" role="status" aria-label="Resultado de úlceras">
            {pressure.total} puntos. {pressure.levelLabel}. {pressure.recommendations.join(" ")}
          </div>
        </fieldset>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {saved ? <Feedback tone="success" label="Resultado del registro">{saved}</Feedback> : null}
        <div className="form-actions-bar">
          <Button type="submit" pending={pending} disabled={pending || advanced}>
            <IconCheck size={18} /> Registrar escalas
          </Button>
        </div>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="escalas" canContinue={advanced} />
    </Sheet>
  );
}

function ScaleRow({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="scale-row">
      <div>
        <p className="scale-question" id={id}>{title}</p>
        <p className="hint">{hint}</p>
      </div>
      <div className="scale-options" role="group" aria-labelledby={id}>
        {children}
      </div>
    </div>
  );
}

function ScoreSelect({
  id, label, max, value, labels, onChange,
}: {
  id: string;
  label: string;
  max: 3 | 4;
  value: number;
  labels: Record<number, string>;
  onChange: (value: number) => void;
}) {
  return (
    <SelectField id={id} label={label} value={String(value)} onChange={(event) => onChange(Number(event.target.value))} compact>
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => (
        <option key={score} value={score}>{labels[score] ?? `${score} pts`}</option>
      ))}
    </SelectField>
  );
}
