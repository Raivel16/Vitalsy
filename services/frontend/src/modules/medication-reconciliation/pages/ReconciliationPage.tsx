import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { reviewReconciliation, type HomeMedication } from "../domain/bpmhAlerts";

const EMPTY: HomeMedication = { name: "", dose: "", frequency: "", route: "oral" };

export function ReconciliationPage() {
  const [allergies, setAllergies] = useState("");
  const [draft, setDraft] = useState<HomeMedication>(EMPTY);
  const [medications, setMedications] = useState<HomeMedication[]>([]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const review = useMemo(() => reviewReconciliation(allergies, medications), [allergies, medications]);

  function addMedication() {
    if (!draft.name.trim() || !draft.dose.trim() || !draft.frequency.trim()) return;
    setMedications((current) => [...current, draft]);
    setDraft(EMPTY);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ reconciliation: { statusLabel: string } }>(
        "/api/v1/hospital-admission/medication-reconciliations",
        { method: "POST", body: JSON.stringify({ allergies, medications, status: review.status }) },
      );
      setResult(data.reconciliation.statusLabel);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la conciliación."));
    }
  }

  return (
    <Sheet kicker="Enfermería" title="Conciliación farmacéutica de ingreso">
      <p className="lead">Registre los medicamentos domiciliarios y revise las alertas de alergia o interacción.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="known-allergies" label="Alergias conocidas" value={allergies} onChange={(event) => setAllergies(event.target.value)} />
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
        <button className="button button-quiet" type="button" onClick={addMedication}>Agregar medicamento</button>
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
        <p role="status" aria-label="Estado de conciliación">{review.label}</p>
        {review.alerts.map((alert) => <p key={alert} role="alert">{alert}</p>)}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {result ? <p role="status" aria-label="Resultado del registro">{result}</p> : null}
        <button className="button" type="submit">Registrar conciliación</button>
      </form>
    </Sheet>
  );
}
