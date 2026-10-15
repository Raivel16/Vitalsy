import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconCheck, IconDeviceHeartMonitor, IconPlus } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { BloodPressureField } from "../../../shared/ui/BloodPressureField";
import { CheckField, SelectField, TextAreaField, TextField, UnitField } from "../../../shared/ui/Field";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { calculateNews2, type Consciousness, type Spo2Scale } from "../domain/news2";
import { validateVitalSigns } from "../domain/vitalSigns";
import { requiredText } from "../../../shared/validation/inputRules";
import { LifeBaselineMetrics } from "../../admission/components/LifeBaselineMetrics";
import { canReadLifeBaseline, type LifeBaseline } from "../../admission/domain/lifeBaseline";
import { formatDateTime } from "../../../shared/datetime/format";

function draftKey(encounterId: string, step: string) {
  return `vitalsy-draft-${step}-${encounterId}`;
}

export function NursingAssessmentPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const [complaint, setComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [allergy, setAllergy] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [noneOther, setNoneOther] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [baseline, setBaseline] = useState<LifeBaseline | null>(null);
  const encounterId = encounter?.encounterId;
  const canReadBaseline = canReadLifeBaseline(role);

  useEffect(() => {
    if (!encounterId || !canReadBaseline) return;
    let active = true;
    api<{ baseline: LifeBaseline | null }>(
      `/api/v1/hospital-admission/encounters/${encodeURIComponent(encounterId)}/life-baseline`,
    )
      .then((payload) => {
        if (active) setBaseline(payload?.baseline ?? null);
      })
      .catch(() => {
        if (active) setBaseline(null);
      });
    return () => {
      active = false;
    };
  }, [encounterId, canReadBaseline]);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería de piso · Ingreso clínico" title="Valoración inicial" wide framed clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar la valoración." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  function addAllergy() {
    if (!allergy.trim()) return;
    setAllergies((current) => [...current, allergy.trim()]);
    setAllergy("");
    setNoneOther(false);
  }

  function saveDraft() {
    sessionStorage.setItem(draftKey(activeEncounter.encounterId, "valoracion"), JSON.stringify({
      complaint, history, allergies,
    }));
    setDraftNotice("Borrador guardado en este equipo.");
    setSaved("");
  }

  async function onSubmit(event: SyntheticEvent) {
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
      setDraftNotice("");
      setError("");
      sessionStorage.removeItem(draftKey(activeEncounter.encounterId, "valoracion"));
      if (activeEncounter.currentStep === "valoracion") {
        const nextEncounter = await advanceEncounter(activeEncounter.encounterId, "valoracion");
        applyEncounter(nextEncounter);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo guardar la valoración."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Enfermería de piso · Ingreso clínico" title="Valoración inicial" wide framed clinic="form">
      <p className="lead">
        Registre la anamnesis de enfermería, antecedentes patológicos y alergias conocidas de {activeEncounter.patientName} al momento de la admisión en sala.
      </p>
      <div className="nursing-callout">
        <IconDeviceHeartMonitor size={20} aria-hidden />
        <div>
          <strong>Línea de base Vitalsy Life</strong>
          {baseline && baseline.metrics.length > 0 ? (
            <>
              <LifeBaselineMetrics metrics={baseline.metrics} />
              {baseline.importedAt ? <p className="hint">Importada el {formatDateTime(baseline.importedAt)}</p> : null}
            </>
          ) : (
            <p>Aún no hay línea de base importada de Vitalsy Life.</p>
          )}
        </div>
      </div>
      <form className="stack nursing-form" onSubmit={onSubmit} noValidate>
        <section className="nursing-section">
          <header className="nursing-section-head">
            <h3>1. Motivo de consulta y situación actual</h3>
            <span>Requerido</span>
          </header>
          <TextAreaField
            id="complaint"
            label="Motivo de consulta"
            hideLabel
            compact
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            error={errors.complaint}
            required
            rows={5}
            placeholder="Describa el motivo de ingreso y la situación actual."
          />
        </section>
        <section className="nursing-section">
          <header className="nursing-section-head">
            <h3>2. Antecedentes médico-quirúrgicos y comorbilidades</h3>
            <span>Requerido</span>
          </header>
          <TextAreaField
            id="history"
            label="Antecedentes"
            hideLabel
            compact
            value={history}
            onChange={(event) => setHistory(event.target.value)}
            error={errors.history}
            required
            rows={5}
            placeholder="Antecedentes patológicos, quirúrgicos y comorbilidades."
          />
        </section>
        <section className="nursing-section nursing-section-warn">
          <header className="nursing-section-head">
            <h3>
              <IconAlertTriangle size={16} aria-hidden /> 3. Alergias e intolerancias medicamentosas
            </h3>
            <span>{allergies.length} registradas</span>
          </header>
          <div className="nursing-allergy-stack">
            {allergies.length > 0 ? (
              <ul className="allergy-chips" aria-label="Alergias registradas">
                {allergies.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                    <button
                      type="button"
                      className="allergy-chip-remove"
                      aria-label={`Quitar alergia ${item}`}
                      onClick={() => setAllergies((current) => current.filter((entry) => entry !== item))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Sin alergias registradas en esta valoración.</p>
            )}
            <div className="nursing-inline-add">
              <TextField
                id="allergy"
                label="Alergia (opcional)"
                hideLabel
                compact
                value={allergy}
                onChange={(event) => setAllergy(event.target.value)}
                placeholder="Escriba nueva alergia o fármaco"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAllergy();
                  }
                }}
              />
              <Button variant="quiet" type="button" onClick={addAllergy}>
                <IconPlus size={16} /> Agregar alergia
              </Button>
            </div>
          </div>
          <CheckField
            id="no-other-known"
            label="Ninguna otra conocida."
            checked={noneOther}
            onChange={(event) => setNoneOther(event.target.checked)}
          />
        </section>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {draftNotice ? <Feedback tone="info">{draftNotice}</Feedback> : null}
        {saved ? <Feedback tone="success">{saved}</Feedback> : null}
        <div className="form-actions-bar">
          <Button variant="quiet" type="button" onClick={saveDraft}>Guardar borrador</Button>
          <Button type="submit" pending={pending} disabled={pending || advanced}>
            <IconCheck size={18} /> Guardar valoración
          </Button>
        </div>
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
    diastolicBloodPressure: "",
    pulse: "",
    temperature: "",
  });
  const [spo2Scale, setSpo2Scale] = useState<Spo2Scale>("scale1");
  const [supplementalOxygen, setSupplementalOxygen] = useState(false);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [confusionOnset, setConfusionOnset] = useState<"new" | "chronic">("new");
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState("");
  const [alertNotice, setAlertNotice] = useState("");
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
      <Sheet kicker="Enfermería de piso · Constantes vitales" title="Constantes vitales basales" wide framed clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar las constantes." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  function update(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!ready || !news2) return;
    setPending(true);
    setAlertNotice("");
    try {
      const savedVitals = await api<{ alertActivated?: boolean }>("/api/v1/hospital-admission/vital-signs", {
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
      setAlertNotice(
        savedVitals.alertActivated
          ? "Se activó una alerta clínica. Revísela en la campana o en la bandeja de alertas."
          : "",
      );
      setError("");
      if (activeEncounter.currentStep === "constantes") {
        const next = await advanceEncounter(activeEncounter.encounterId, "constantes");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudieron registrar las constantes."));
    } finally {
      setPending(false);
    }
  }

  const visibleErrors = submitted ? liveErrors : {};
  const urgent = Boolean(news2?.singleParameterAlert || news2?.band === "high");

  return (
    <Sheet kicker="Enfermería de piso · Constantes vitales" title="Constantes vitales basales" wide framed clinic="form">
      <p className="lead">
        Toma inicial de signos vitales de {activeEncounter.patientName} para el cálculo automático de la puntuación de riesgo fisiológico NEWS2.
      </p>
      <form className="stack nursing-form" onSubmit={onSubmit} noValidate>
        <div className="vitals-grid">
          <UnitField id="rr" label="Frecuencia respiratoria" unit="rpm" abbr="FR" inputMode="numeric" value={fields.respiratoryRate} onChange={(event) => update("respiratoryRate", event.target.value)} error={visibleErrors.respiratoryRate} />
          <UnitField id="spo2" label="Saturación" unit="%" abbr="SpO2" inputMode="numeric" value={fields.oxygenSaturation} onChange={(event) => update("oxygenSaturation", event.target.value)} error={visibleErrors.oxygenSaturation} />
          <BloodPressureField
            systolic={fields.systolicBloodPressure}
            diastolic={fields.diastolicBloodPressure}
            onSystolic={(value) => update("systolicBloodPressure", value)}
            onDiastolic={(value) => update("diastolicBloodPressure", value)}
            systolicError={visibleErrors.systolicBloodPressure}
            diastolicError={visibleErrors.diastolicBloodPressure}
          />
        </div>
        <div className="vitals-grid vitals-grid-2">
          <UnitField id="pulse" label="Pulso" unit="lpm" abbr="FC" inputMode="numeric" value={fields.pulse} onChange={(event) => update("pulse", event.target.value)} error={visibleErrors.pulse} />
          <UnitField id="temperature" label="Temperatura" unit="°C" abbr="Temp" inputMode="decimal" value={fields.temperature} onChange={(event) => update("temperature", event.target.value)} error={visibleErrors.temperature} />
        </div>
        <div className="vitals-grid">
          <SelectField id="spo2-scale" label="Escala de SpO2" value={spo2Scale} onChange={(event) => setSpo2Scale(event.target.value as Spo2Scale)} hint="Escala 2 solo si un clínico indicó objetivo 88-92 %.">
            <option value="scale1">Escala 1 (estándar)</option>
            <option value="scale2">Escala 2 · objetivo 88-92 %</option>
          </SelectField>
          <SelectField id="oxygen" label="Oxígeno suplementario" value={supplementalOxygen ? "yes" : "no"} onChange={(event) => setSupplementalOxygen(event.target.value === "yes")}>
            <option value="no">Aire ambiente (sin O2)</option>
            <option value="yes">Oxígeno suplementario</option>
          </SelectField>
          <SelectField id="consciousness" label="Conciencia" value={consciousness} onChange={(event) => setConsciousness(event.target.value as Consciousness)}>
            <option value="alert">Alerta</option>
            <option value="confusion">Confusión</option>
            <option value="voice">Responde a la voz</option>
            <option value="pain">Responde al dolor</option>
            <option value="unresponsive">No responde</option>
          </SelectField>
        </div>
        {consciousness === "confusion" ? (
          <SelectField id="confusion-onset" label="Inicio de la confusión" value={confusionOnset} onChange={(event) => setConfusionOnset(event.target.value as "new" | "chronic")}>
            <option value="new">Nueva</option>
            <option value="chronic">Crónica, ya conocida</option>
          </SelectField>
        ) : null}
        {news2 ? (
          <div className={`news news-${news2.visual} news-banner`} role={urgent ? "alert" : "status"} aria-label={urgent ? undefined : "Resultado NEWS2"}>
            <div>
              <strong>Puntuación calculada NEWS2: {news2.total} puntos. {news2.visualLabel}.</strong>
              <span>{news2.clinicalResponse}</span>
              <span>{news2.monitoring}. Fuente: {news2.source}.</span>
            </div>
            <span className="news-chip">NEWS2 {news2.total}</span>
          </div>
        ) : null}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {alertNotice ? <Feedback tone="info" label="Alerta clínica">{alertNotice}</Feedback> : null}
        {saved ? <Feedback tone="success">{saved}</Feedback> : null}
        <div className="form-actions-bar">
          <Button type="submit" pending={pending} disabled={pending || advanced}>
            <IconCheck size={18} /> Registrar constantes
          </Button>
        </div>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="constantes" canContinue={advanced} />
    </Sheet>
  );
}
