import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextAreaField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { requiredText } from "../../../shared/validation/inputRules";

type NoteRow = {
  id: number;
  body: string;
  signed: boolean;
  authorName: string | null;
};

export function MedicalEvolutionPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [notes, setNotes] = useState<NoteRow[] | null>(null);
  const [body, setBody] = useState("");
  const [sign, setSign] = useState(true);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    api<{ notes: NoteRow[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/medical-evolution-notes`)
      .then((data) => {
        if (active) setNotes(data.notes);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudieron cargar las notas."));
      });
    return () => {
      active = false;
    };
  }, [ingreso]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const message = requiredText(body, "La nota de evolución es obligatoria.") ?? "";
    setFieldError(message);
    if (message) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ note: NoteRow }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/medical-evolution-notes`,
        { method: "POST", body: JSON.stringify({ body: body.trim(), sign }) },
      );
      setNotes((prev) => [data.note, ...(prev ?? [])]);
      setBody("");
      setNotice("Evolución registrada.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la evolución."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado desde el censo para registrar la evolución." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Evolución médica">
      <p className="lead">
        Registre la evolución clínica del paciente
        {encounter ? ` ${encounter.patientName}` : ""} durante la visita.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextAreaField
          id="evolution-body"
          label="Nota de evolución"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          error={fieldError}
          rows={5}
          required
        />
        <label className="check">
          <input type="checkbox" checked={sign} onChange={(event) => setSign(event.target.checked)} />
          Firmar digitalmente la nota
        </label>
        <FormActions>
          <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar evolución"}</Button>
        </FormActions>
      </form>
      {notes && notes.length > 0 ? (
        <ul className="stack result-block" aria-label="Notas registradas">
          {notes.map((item) => (
            <li key={item.id}>
              <strong>{item.body}</strong>
              <span className="hint">
                {[item.authorName, item.signed ? "Firmada" : "Borrador"].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Sheet>
  );
}
