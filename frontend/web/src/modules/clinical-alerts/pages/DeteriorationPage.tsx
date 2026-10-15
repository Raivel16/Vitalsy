import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { SelectField, TextAreaField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";

export function DeteriorationPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState<"media" | "alta">("media");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;

    if (note.trim().length < 5) {
      setFieldError("Describa el deterioro observado.");
      return;
    }
    setFieldError("");
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api("/api/v1/clinical-alerts/observations", {
        method: "POST",
        body: JSON.stringify({ encounterId: ingreso, note: note.trim(), severity }),
      });
      setNotice("Se registró el deterioro y se notificó a la enfermera de piso responsable.");
      setNote("");
      setSeverity("media");
    } catch (error_) {
      setError(errorText(error_, "No se pudo registrar el deterioro observado."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return (
      <Sheet kicker="Observación clínica" title="Registrar deterioro observado" clinic="form" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado para registrar un deterioro." />
      </Sheet>
    );
  }

  return (
    <Sheet kicker="Observación clínica" title="Registrar deterioro observado" clinic="form" className="floor-care">
      <p className="lead">
        Registre el deterioro que observó
        {encounter ? ` en ${encounter.patientName}` : ""} fuera del monitoreo rutinario. La enfermera de piso recibirá la
        alerta de inmediato.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextAreaField
          id="deterioration-note"
          label="Deterioro observado"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={fieldError}
          hint="Describa lo que observó: color, respiración, respuesta del paciente."
        />
        <SelectField
          id="deterioration-severity"
          label="Severidad percibida"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as "media" | "alta")}
        >
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </SelectField>
        <FormActions>
          <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar deterioro"}</Button>
        </FormActions>
      </form>
    </Sheet>
  );
}
