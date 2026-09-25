import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { calculateNews2, type Consciousness, type Spo2Scale } from "../domain/news2";
import { validateVitalSigns } from "../domain/vitalSigns";
import { requiredText } from "../../../shared/validation/inputRules";

export function NursingAssessmentPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const [complaint, setComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [allergy, setAllergy] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Valoración inicial">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar la valoración." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const complaintIssue = requiredText(complaint, "El motivo de consulta es obligatorio.");
    if (complaintIssue) next.complaint = complaintIssue;
    const historyIssue = requiredText(history, "Los antecedentes son obligatorios.");
    if (historyIssue) next.history = historyIssue;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    try {
      await api("/api/v1/hospital-admission/nursing-assessments", {
        method: "POST",
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          chiefComplaint: complaint,
          history,
          allergies,
        }),
      });
      setSaved("Valoración registrada.");
      setError("");
      if (activeEncounter.currentStep === "valoracion") {
        const nextEncounter = await advanceEncounter(activeEncounter.encounterId, "valoracion");
        applyEncounter(nextEncounter);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo guardar la valoración."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Enfermería" title="Valoración inicial">
      <p className="lead">Anamnesis, alergias y antecedentes de {activeEncounter.patientName}.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="complaint" label="Motivo de consulta" value={complaint} onChange={(event) => setComplaint(event.target.value)} error={errors.complaint} required />
        <TextField id="history" label="Antecedentes" value={history} onChange={(event) => setHistory(event.target.value)} error={errors.history} required />
        <div className="allergy-add">
          <TextField id="allergy" label="Alergia (opcional)" value={allergy} onChange={(event) => setAllergy(event.target.value)} hint="Solo si el paciente declara alergias." />
          <FormActions>
            <Button
              variant="quiet"
              type="button"
              onClick={() => {
                if (!allergy.trim()) return;
                setAllergies((current) => [...current, allergy.trim()]);
                setAllergy("");
              }}
            >
              Agregar alergia
            </Button>
          </FormActions>
        </div>
        {allergies.length > 0 ? (
          <ul>{allergies.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : <p className="empty">Sin alergias registradas en esta valoración.</p>}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {saved ? <Feedback tone="success">{saved}</Feedback> : null}
        <FormActions align="center">
          <Button type="submit" pending={pending}>Guardar valoración</Button>
        </FormActions>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="valoracion" canContinue={advanced} />
    </Sheet>
  );
}

export function VitalSignsPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const [fields, setFields] = useState({
    respiratoryRate: "",
    oxygenSaturation: "",
    systolicBloodPressure: "",
    pulse: "",
    temperature: "",
  });
  const [spo2Scale, setSpo2Scale] = useState<Spo2Scale>("scale1");
  const [supplementalOxygen, setSupplementalOxygen] = useState(false);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [confusionOnset, setConfusionOnset] = useState<"new" | "chronic">("new");
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const liveErrors = validateVitalSigns(fields);
  const ready = Object.keys(liveErrors).length === 0;
  const news2 = useMemo(() => {
    if (!ready) return null;
    return calculateNews2({
      respiratoryRate: Number(fields.respiratoryRate),
      oxygenSaturation: Number(fields.oxygenSaturation),
      spo2Scale,
      supplementalOxygen,
      systolicBloodPressure: Number(fields.systolicBloodPressure),
      pulse: Number(fields.pulse),
      consciousness,
      confusionOnset,
      temperature: Number(fields.temperature.replace(",", ".")),
    });
  }, [consciousness, confusionOnset, fields, ready, spo2Scale, supplementalOxygen]);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Constantes vitales basales">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar las constantes." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  function update(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!ready || !news2) return;
    setPending(true);
    try {
      await api("/api/v1/hospital-admission/vital-signs", {
        method: "POST",
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          ...fields,
          spo2Scale,
          supplementalOxygen,
          consciousness,
          confusionOnset,
          news2Total: news2.total,
        }),
      });
      setSaved("Constantes registradas.");
      setError("");
      if (activeEncounter.currentStep === "constantes") {
        const next = await advanceEncounter(activeEncounter.encounterId, "constantes");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudieron registrar las constantes."));
    } finally {
      setPending(false);
    }
  }

  const visibleErrors = submitted ? liveErrors : {};
  const urgent = Boolean(news2?.singleParameterAlert || news2?.band === "high");

  return (
    <Sheet kicker="Enfermería" title="Constantes vitales basales">
      <p className="lead">El sistema calcula el NEWS2 de {activeEncounter.patientName}.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <TextField id="rr" label="Frecuencia respiratoria" inputMode="numeric" value={fields.respiratoryRate} onChange={(event) => update("respiratoryRate", event.target.value)} error={visibleErrors.respiratoryRate} hint="respiraciones/min" />
          <TextField id="spo2" label="Saturación" inputMode="numeric" value={fields.oxygenSaturation} onChange={(event) => update("oxygenSaturation", event.target.value)} error={visibleErrors.oxygenSaturation} hint="%" />
          <TextField id="sbp" label="Presión sistólica" inputMode="numeric" value={fields.systolicBloodPressure} onChange={(event) => update("systolicBloodPressure", event.target.value)} error={visibleErrors.systolicBloodPressure} hint="mmHg" />
          <TextField id="pulse" label="Pulso" inputMode="numeric" value={fields.pulse} onChange={(event) => update("pulse", event.target.value)} error={visibleErrors.pulse} hint="latidos/min" />
          <TextField id="temperature" label="Temperatura" inputMode="decimal" value={fields.temperature} onChange={(event) => update("temperature", event.target.value)} error={visibleErrors.temperature} hint="°C" />
        </div>
        <SelectField id="spo2-scale" label="Escala de SpO2" value={spo2Scale} onChange={(event) => setSpo2Scale(event.target.value as Spo2Scale)} hint="Escala 2 solo si un clínico indicó objetivo 88-92 %.">
          <option value="scale1">Escala 1</option>
          <option value="scale2">Escala 2 · objetivo 88-92 %</option>
        </SelectField>
        <label className="check">
          <input type="checkbox" checked={supplementalOxygen} onChange={(event) => setSupplementalOxygen(event.target.checked)} />
          Oxígeno suplementario
        </label>
        <SelectField id="consciousness" label="Conciencia" value={consciousness} onChange={(event) => setConsciousness(event.target.value as Consciousness)}>
          <option value="alert">Alerta</option>
          <option value="confusion">Confusión</option>
          <option value="voice">Responde a la voz</option>
          <option value="pain">Responde al dolor</option>
          <option value="unresponsive">No responde</option>
        </SelectField>
        {consciousness === "confusion" ? (
          <SelectField id="confusion-onset" label="Inicio de la confusión" value={confusionOnset} onChange={(event) => setConfusionOnset(event.target.value as "new" | "chronic")}>
            <option value="new">Nueva</option>
            <option value="chronic">Crónica, ya conocida</option>
          </SelectField>
        ) : null}
        {news2 ? (
          <div className={`news news-${news2.visual}`} role={urgent ? "alert" : "status"} aria-label={urgent ? undefined : "Resultado NEWS2"}>
            <strong>{news2.total} puntos. {news2.visualLabel}.</strong>
            <span>{news2.clinicalResponse}</span>
            <span>{news2.monitoring}. Fuente: {news2.source}.</span>
          </div>
        ) : null}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {saved ? <Feedback tone="success">{saved}</Feedback> : null}
        <Button type="submit" pending={pending}>Registrar constantes</Button>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="constantes" canContinue={advanced} />
    </Sheet>
  );
}
