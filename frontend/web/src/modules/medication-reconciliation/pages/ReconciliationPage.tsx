import { type SyntheticEvent, useMemo, useState } from "react";
import { IconAlertTriangle, IconCheck, IconPlus } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { CheckField, SelectField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { StatusPill } from "../../../shared/ui/clinical";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { reviewReconciliation, type HomeMedication } from "../domain/bpmhAlerts";

const EMPTY: HomeMedication = { name: "", dose: "", frequency: "", route: "oral" };

const ROUTE_LABEL: Record<string, string> = {
  oral: "Oral",
  intravenosa: "Intravenosa",
  subcutánea: "Subcutánea",
  inhalatoria: "Inhalatoria",
};

export function ReconciliationPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const [allergies, setAllergies] = useState("");
  const [noneDeclared, setNoneDeclared] = useState(false);
  const [draft, setDraft] = useState<HomeMedication>(EMPTY);
  const [medications, setMedications] = useState<HomeMedication[]>([]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const review = useMemo(
    () => reviewReconciliation(allergies, medications, noneDeclared),
    [allergies, medications, noneDeclared],
  );

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería de piso · Seguridad farmacológica (BPMH)" title="Conciliación farmacéutica de ingreso" wide framed clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar la conciliación." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;
  const interviewedAt = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  function addMedication() {
    if (!draft.name.trim() || !draft.dose.trim() || !draft.frequency.trim()) return;
    setMedications((current) => [...current, draft]);
    setDraft(EMPTY);
    setNoneDeclared(false);
  }

  function saveDraft() {
    sessionStorage.setItem(`vitalsy-draft-conciliacion-${activeEncounter.encounterId}`, JSON.stringify({
      allergies, medications, notes, noneDeclared,
    }));
    setDraftNotice("Borrador guardado en este equipo.");
    setResult("");
  }

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const data = await api<{ reconciliation: { statusLabel: string } }>(
        "/api/v1/hospital-admission/medication-reconciliations",
        {
          method: "POST",
          body: JSON.stringify({
            encounterId: activeEncounter.encounterId,
            allergies,
            medications,
            noHomeMedications: noneDeclared,
            notes: notes.trim() || undefined,
            status: review.status,
          }),
        },
      );
      setResult(data.reconciliation.statusLabel);
      setDraftNotice("");
      setError("");
      if (activeEncounter.currentStep === "conciliacion") {
        const next = await advanceEncounter(activeEncounter.encounterId, "conciliacion");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo registrar la conciliación."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Enfermería de piso · Seguridad farmacológica (BPMH)" title="Conciliación farmacéutica de ingreso" wide framed clinic="form">
      <p className="lead">
        Registre la medicación habitual que {activeEncounter.patientName} tomaba en su domicilio previa a la internación.
      </p>
      <dl className="nursing-meta">
        <div>
          <dt>Fuente de información</dt>
          <dd>{activeEncounter.patientName}</dd>
        </div>
        <div>
          <dt>Entrevistador</dt>
          <dd>{user?.name ?? "Enfermería de piso"}</dd>
        </div>
        <div>
          <dt>Fecha y hora entrevista</dt>
          <dd>Hoy · {interviewedAt}</dd>
        </div>
      </dl>
      <form className="stack nursing-form" onSubmit={onSubmit}>
        <CheckField
          id="no-home-meds"
          className="nursing-check"
          label="Sin antecedentes farmacológicos (el paciente no consume medicación habitual)."
          description="Marque esta casilla si el paciente no cuenta con tratamiento activo ni automedicación regular previo al ingreso."
          checked={noneDeclared}
          onChange={(event) => {
            setNoneDeclared(event.target.checked);
            if (event.target.checked) setMedications([]);
          }}
        />
        <section className="nursing-block" aria-label="Medicación habitual previa">
          <header className="nursing-block-head">
            <h3>Medicación habitual previa detectada</h3>
            <span>{medications.length} fármacos</span>
          </header>
          {medications.length === 0 ? (
            <p className="empty">Aún no hay medicamentos domiciliarios.</p>
          ) : (
            <ul className="bpmh-cards">
              {medications.map((item) => (
                <li key={`${item.name}-${item.dose}`} aria-label={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>Dosis: {item.dose} · {ROUTE_LABEL[item.route] ?? item.route}</span>
                  </div>
                  <div>
                    <span className="hint">Frecuencia</span>
                    <span>{item.frequency}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {noneDeclared ? null : (
            <div className="bpmh-draft">
              <div className="form-grid">
                <TextField id="med-name" label="Medicamento" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} compact />
                <TextField id="med-dose" label="Dosis" value={draft.dose} onChange={(event) => setDraft({ ...draft, dose: event.target.value })} compact />
                <TextField id="med-frequency" label="Frecuencia" value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value })} compact />
                <SelectField id="med-route" label="Vía" value={draft.route} onChange={(event) => setDraft({ ...draft, route: event.target.value })} compact>
                  <option value="oral">Oral</option>
                  <option value="intravenosa">Intravenosa</option>
                  <option value="subcutánea">Subcutánea</option>
                  <option value="inhalatoria">Inhalatoria</option>
                </SelectField>
              </div>
              <Button variant="quiet" type="button" className="button-block bpmh-add" onClick={addMedication}>
                <IconPlus size={16} /> Agregar medicamento
              </Button>
            </div>
          )}
        </section>
        <TextField
          id="known-allergies"
          label="Alergias conocidas (opcional)"
          value={allergies}
          onChange={(event) => setAllergies(event.target.value)}
          hint="Puede dejarse vacío si no hay alergias."
        />
        <p role="status" aria-label="Estado de conciliación">
          <StatusPill tone={review.status === "validada" ? "success" : review.status === "con_observaciones" ? "warning" : "neutral"}>
            {review.label}
          </StatusPill>
        </p>
        {review.alerts.map((alert) => (
          <p key={alert} className="nursing-banner nursing-banner-warn" role="alert">
            <IconAlertTriangle size={18} aria-hidden /> {alert}
          </p>
        ))}
        <TextAreaField
          id="recon-notes"
          label="Observaciones adicionales de enfermería"
          labelAside="Opcional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Indique discrepancias justificadas, olvidos de toma o recomendaciones al médico tratante."
        />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {draftNotice ? <Feedback tone="info">{draftNotice}</Feedback> : null}
        {result ? <Feedback tone="success" label="Resultado del registro">{result}</Feedback> : null}
        <div className="form-actions-bar">
          <Button variant="quiet" type="button" onClick={saveDraft}>Guardar borrador</Button>
          <Button type="submit" pending={pending} disabled={pending || advanced}>
            <IconCheck size={18} /> Registrar conciliación
          </Button>
        </div>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="conciliacion" canContinue={advanced} />
    </Sheet>
  );
}
