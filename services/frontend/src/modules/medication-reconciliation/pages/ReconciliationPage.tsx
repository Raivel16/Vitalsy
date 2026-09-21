import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { reviewReconciliation, type HomeMedication } from "../domain/bpmhAlerts";

const EMPTY: HomeMedication = { name: "", dose: "", frequency: "", route: "oral" };

export function ReconciliationPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermeria";
  const [allergies, setAllergies] = useState("");
  const [draft, setDraft] = useState<HomeMedication>(EMPTY);
  const [medications, setMedications] = useState<HomeMedication[]>([]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const review = useMemo(() => reviewReconciliation(allergies, medications), [allergies, medications]);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Conciliación farmacéutica de ingreso">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar la conciliación." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  function addMedication() {
    if (!draft.name.trim() || !draft.dose.trim() || !draft.frequency.trim()) return;
    setMedications((current) => [...current, draft]);
    setDraft(EMPTY);
  }

  async function onSubmit(event: FormEvent) {
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
            status: review.status,
          }),
        },
      );
      setResult(data.reconciliation.statusLabel);
      setError("");
      if (activeEncounter.currentStep === "conciliacion") {
        const next = await advanceEncounter(activeEncounter.encounterId, "conciliacion");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la conciliación."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Enfermería" title="Conciliación farmacéutica de ingreso">
      <p className="lead">Medicamentos domiciliarios de {activeEncounter.patientName}.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="known-allergies" label="Alergias conocidas (opcional)" value={allergies} onChange={(event) => setAllergies(event.target.value)} hint="Puede dejarse vacío si no hay alergias." />
        <div className="form-grid">
          <TextField id="med-name" label="Medicamento" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <TextField id="med-dose" label="Dosis" value={draft.dose} onChange={(event) => setDraft({ ...draft, dose: event.target.value })} />
          <TextField id="med-frequency" label="Frecuencia" value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value })} />
          <SelectField id="med-route" label="Vía" value={draft.route} onChange={(event) => setDraft({ ...draft, route: event.target.value })}>
            <option value="oral">Oral</option>
            <option value="intravenosa">Intravenosa</option>
            <option value="subcutánea">Subcutánea</option>
            <option value="inhalatoria">Inhalatoria</option>
          </SelectField>
        </div>
        <Button variant="quiet" type="button" onClick={addMedication}>Agregar medicamento</Button>
        <div className="table-wrap">
          <table>
            <caption>Medicamentos domiciliarios</caption>
            <thead>
              <tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Vía</th></tr>
            </thead>
            <tbody>
              {medications.length === 0 ? (
                <tr><td colSpan={4}>Aún no hay medicamentos domiciliarios.</td></tr>
              ) : medications.map((item) => (
                <tr key={`${item.name}-${item.dose}`}>
                  <td>{item.name}</td>
                  <td>{item.dose}</td>
                  <td>{item.frequency}</td>
                  <td>{item.route === "oral" ? "Oral" : item.route}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p role="status" aria-label="Estado de conciliación">{review.label}</p>
        {review.alerts.map((alert) => <p key={alert} role="alert">{alert}</p>)}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {result ? <Feedback tone="success" label="Resultado del registro">{result}</Feedback> : null}
        <Button type="submit" pending={pending}>Registrar conciliación</Button>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="conciliacion" canContinue={advanced} />
    </Sheet>
  );
}
