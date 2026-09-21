import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { SelectField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { calculateBraden, type BradenFriction, type BradenScore4 } from "../domain/bradenScale";
import { calculateMorse } from "../domain/morseFallScale";

export function RiskScalesPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermeria";
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
      <Sheet kicker="Enfermería" title="Escalas de riesgo">
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
    <Sheet kicker="Enfermería" title="Escalas de riesgo">
      <p className="lead">Morse y Braden para {activeEncounter.patientName}.</p>
      <form className="stack" onSubmit={onSubmit}>
        <fieldset>
          <legend>Escala de Morse</legend>
          <div className="choice-row">
            <label><input type="radio" name="falls" checked={!historyOfFalling} onChange={() => setHistoryOfFalling(false)} /> Antecedente de caídas: no</label>
            <label><input type="radio" name="falls" checked={historyOfFalling} onChange={() => setHistoryOfFalling(true)} /> Antecedente de caídas: sí</label>
          </div>
          <div className="choice-row">
            <label><input type="radio" name="dx" checked={!secondaryDiagnosis} onChange={() => setSecondaryDiagnosis(false)} /> Diagnóstico secundario: no</label>
            <label><input type="radio" name="dx" checked={secondaryDiagnosis} onChange={() => setSecondaryDiagnosis(true)} /> Diagnóstico secundario: sí</label>
          </div>
          <SelectField id="aid" label="Ayuda para deambular" value={ambulatoryAid} onChange={(event) => setAmbulatoryAid(event.target.value as typeof ambulatoryAid)}>
            <option value="none">Ninguna, reposo o ayuda de enfermería</option>
            <option value="device">Bastón, muleta o andador</option>
            <option value="furniture">Se apoya en el mobiliario</option>
          </SelectField>
          <div className="choice-row">
            <label><input type="radio" name="iv" checked={!intravenousAccess} onChange={() => setIntravenousAccess(false)} /> Vía intravenosa: no</label>
            <label><input type="radio" name="iv" checked={intravenousAccess} onChange={() => setIntravenousAccess(true)} /> Vía intravenosa: sí</label>
          </div>
          <div className="choice-row">
            <label><input type="radio" name="gait" checked={gait === "normal"} onChange={() => setGait("normal")} /> Marcha: normal</label>
            <label><input type="radio" name="gait" checked={gait === "weak"} onChange={() => setGait("weak")} /> Marcha: débil</label>
            <label><input type="radio" name="gait" checked={gait === "impaired"} onChange={() => setGait("impaired")} /> Marcha: alterada</label>
          </div>
          <div className="choice-row">
            <label><input type="radio" name="mental" checked={mentalStatus === "oriented"} onChange={() => setMentalStatus("oriented")} /> Conoce sus límites</label>
            <label><input type="radio" name="mental" checked={mentalStatus === "overestimates"} onChange={() => setMentalStatus("overestimates")} /> Sobreestima o olvida sus límites</label>
          </div>
          <p role="status" aria-label="Resultado de caídas">
            {morse.total} puntos. {morse.levelLabel}. {morse.recommendations.join(" ")}
          </p>
        </fieldset>
        <fieldset>
          <legend>Escala de Braden</legend>
          <div className="form-grid">
            <ScoreSelect id="sensory" label="Percepción sensorial" max={4} value={braden.sensoryPerception} onChange={(value) => setBraden({ ...braden, sensoryPerception: value as BradenScore4 })} />
            <ScoreSelect id="moisture" label="Humedad" max={4} value={braden.moisture} onChange={(value) => setBraden({ ...braden, moisture: value as BradenScore4 })} />
            <ScoreSelect id="activity" label="Actividad" max={4} value={braden.activity} onChange={(value) => setBraden({ ...braden, activity: value as BradenScore4 })} />
            <ScoreSelect id="mobility" label="Movilidad" max={4} value={braden.mobility} onChange={(value) => setBraden({ ...braden, mobility: value as BradenScore4 })} />
            <ScoreSelect id="nutrition" label="Nutrición" max={4} value={braden.nutrition} onChange={(value) => setBraden({ ...braden, nutrition: value as BradenScore4 })} />
            <ScoreSelect id="friction" label="Fricción y cizallamiento" max={3} value={braden.frictionShear} onChange={(value) => setBraden({ ...braden, frictionShear: value as BradenFriction })} />
          </div>
          <p role="status" aria-label="Resultado de úlceras">
            {pressure.total} puntos. {pressure.levelLabel}. {pressure.recommendations.join(" ")}
          </p>
        </fieldset>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {saved ? <Feedback tone="success" label="Resultado del registro">{saved}</Feedback> : null}
        <Button type="submit" pending={pending}>Registrar escalas</Button>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="escalas" canContinue={advanced} />
    </Sheet>
  );
}

function ScoreSelect({ id, label, max, value, onChange }: { id: string; label: string; max: 3 | 4; value: number; onChange: (value: number) => void }) {
  return (
    <SelectField id={id} label={label} value={String(value)} onChange={(event) => onChange(Number(event.target.value))}>
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => (
        <option key={score} value={score}>{score}</option>
      ))}
    </SelectField>
  );
}
