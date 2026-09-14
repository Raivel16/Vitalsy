import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../../app/api";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { calculateNews2, type Consciousness, type Spo2Scale } from "../domain/news2";
import { validateVitalSigns } from "../domain/vitalSigns";

export function NursingAssessmentPage() {
  const [complaint, setComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [allergy, setAllergy] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saved, setSaved] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!complaint.trim()) {
      setFieldError("El motivo de consulta es obligatorio.");
      return;
    }
    setFieldError("");
    try {
      await api("/api/v1/hospital-admission/nursing-assessments", {
        method: "POST",
        body: JSON.stringify({ encounterId: "ENC-0001", chiefComplaint: complaint, history, allergies }),
      });
      setSaved("Valoración registrada.");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la valoración.");
    }
  }

  return (
    <Sheet kicker="RF-11 · Enfermería" title="Valoración inicial">
      <p className="lead">Anamnesis, alergias y antecedentes a pie de cama.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="complaint" label="Motivo de consulta" value={complaint} onChange={(event) => setComplaint(event.target.value)} error={fieldError} />
        <TextField id="history" label="Antecedentes" value={history} onChange={(event) => setHistory(event.target.value)} />
        <div className="inline-add">
          <TextField id="allergy" label="Alergia" value={allergy} onChange={(event) => setAllergy(event.target.value)} />
          <button
            className="button button-quiet"
            type="button"
            onClick={() => {
              if (!allergy.trim()) return;
              setAllergies((current) => [...current, allergy.trim()]);
              setAllergy("");
            }}
          >
            Agregar alergia
          </button>
        </div>
        {allergies.length > 0 ? (
          <ul>{allergies.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : <p className="empty">Sin alergias registradas en esta valoración.</p>}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {saved ? <Feedback tone="success">{saved}</Feedback> : null}
        <button className="button" type="submit">Guardar valoración</button>
      </form>
    </Sheet>
  );
}

export function VitalSignsPage() {
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

  function update(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!ready || !news2) return;
    try {
      await api("/api/v1/hospital-admission/vital-signs", {
        method: "POST",
        body: JSON.stringify({ ...fields, spo2Scale, supplementalOxygen, consciousness, confusionOnset, news2Total: news2.total }),
      });
      setSaved("Constantes registradas.");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron registrar las constantes.");
    }
  }

  const visibleErrors = submitted ? liveErrors : {};
  const urgent = Boolean(news2?.singleParameterAlert || news2?.band === "high");

  return (
    <Sheet kicker="RF-12 · Enfermería" title="Constantes vitales basales">
      <p className="lead">El NEWS2 se calcula con la tabla del Royal College of Physicians, 2017. No activa todavía el flujo de alertas del módulo 3.</p>
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
        <button className="button" type="submit">Registrar constantes</button>
      </form>
    </Sheet>
  );
}
