import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../../app/api";
import { useEncounter } from "../../admission-census/EncounterContext";
import { errorText } from "../../../app/userMessage";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

export function FiliationPage() {
  const encounter = useEncounter();
  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  useEffect(() => {
    if (!encounter) return;
    setFullName(encounter.patientName);
    setDocumentNumber(encounter.documentNumber);
  }, [encounter]);
  const [birthDate, setBirthDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "El nombre completo es obligatorio.";
    if (!documentNumber.trim()) next.documentNumber = "El documento es obligatorio.";
    if (!confirmed) next.confirmed = "Confirme que los datos coinciden con la orden.";
    setErrors(next);
    setSuccess("");
    setError("");
    if (Object.keys(next).length > 0) return;

    try {
      await api("/api/v1/hospital-admission/filiation/validate", {
        method: "POST",
        body: JSON.stringify({ fullName, documentNumber, birthDate, confirmed }),
      });
      setSuccess("Filiación validada. Puede continuar con la cobertura.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo validar la filiación."));
    }
  }

  return (
    <Sheet kicker="Admisión" title="Datos filiatorios">
      <p className="lead">Contraste nombre, documento y fecha de nacimiento antes de aprobar la ficha de ingreso.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="full-name" label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} error={errors.fullName} autoComplete="name" />
        <TextField id="document-number" label="Número de documento" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} error={errors.documentNumber} />
        <TextField id="birth-date" label="Fecha de nacimiento" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
        <CheckField id="filiation-confirmed" label="Los datos coinciden con la orden de internamiento" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} error={errors.confirmed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {success ? <Feedback tone="success">{success}</Feedback> : null}
        <button className="button" type="submit">Validar filiación</button>
      </form>
    </Sheet>
  );
}
