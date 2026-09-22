import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { requiredText } from "../../../shared/validation/inputRules";

export function NursingEvolutionCarePage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [body, setBody] = useState("");
  const [care, setCare] = useState("Higiene matutina");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");

  async function onNursingNote(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const message = requiredText(body, "La nota de evolución de enfermería es obligatoria.") ?? "";
    setFieldError(message);
    if (message) return;
    setError("");
    try {
      await api(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/nursing-evolution-notes`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setNotice("Nota de enfermería registrada.");
      setBody("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la nota."));
    }
  }

  async function onCare(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    setError("");
    try {
      await api(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/care-activities`, {
        method: "POST",
        body: JSON.stringify({ activityLabel: care.trim() }),
      });
      setNotice("Cuidado directo marcado como finalizado.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar el cuidado."));
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado para documentar cuidados." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Cuidados y evolución de enfermería">
      <p className="lead">
        Documente la evolución del turno y los cuidados básicos
        {encounter ? ` de ${encounter.patientName}` : ""}.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      <form className="stack" onSubmit={onNursingNote} noValidate>
        <h3>Evolución de enfermería</h3>
        <TextAreaField id="nurse-note" label="Nota de evolución" value={body} onChange={(e) => setBody(e.target.value)} error={fieldError} rows={4} required />
        <FormActions>
          <Button type="submit">Registrar nota</Button>
        </FormActions>
      </form>
      <form className="stack" onSubmit={onCare} noValidate>
        <h3>Cuidados directos</h3>
        <TextField id="care-label" label="Actividad" value={care} onChange={(e) => setCare(e.target.value)} required />
        <FormActions>
          <Button type="submit">Marcar finalizado</Button>
        </FormActions>
      </form>
    </Sheet>
  );
}
