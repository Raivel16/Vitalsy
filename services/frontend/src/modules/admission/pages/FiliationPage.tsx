import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { StepNav } from "../../admission-census/ui/StepNav";
import { errorText } from "../../../app/userMessage";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { digitsOnly, documentNumberError, requiredText } from "../../../shared/validation/inputRules";

export function FiliationPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  useEffect(() => {
    if (!encounter) return;
    setFullName(encounter.patientName);
    setDocumentNumber(digitsOnly(encounter.documentNumber));
  }, [encounter]);
  const [birthDate, setBirthDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Datos filiatorios">
        <Feedback tone="info">Abra un paciente desde el censo para validar su filiación.</Feedback>
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      </Sheet>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const nameIssue = requiredText(fullName, "El nombre completo es obligatorio.");
    if (nameIssue) next.fullName = nameIssue;
    const documentIssue = documentNumberError(documentNumber, "El documento");
    if (documentIssue) next.documentNumber = documentIssue;
    const birthIssue = requiredText(birthDate, "La fecha de nacimiento es obligatoria.");
    if (birthIssue) next.birthDate = birthIssue;
    if (!confirmed) next.confirmed = "Confirme que los datos coinciden con la orden.";
    setErrors(next);
    setSuccess("");
    setError("");
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await api("/api/v1/hospital-admission/filiation/validate", {
        method: "POST",
        body: JSON.stringify({
          encounterId: encounter.encounterId,
          fullName,
          documentNumber,
          birthDate,
          confirmed,
        }),
      });
      setSuccess("Filiación validada.");
      if (encounter.currentStep === "filiacion") {
        const updated = await advanceEncounter(encounter.encounterId, "filiacion");
        applyEncounter(updated);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo validar la filiación."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Datos filiatorios">
      <p className="lead">Contraste los datos de {encounter.patientName} antes de continuar.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="full-name" label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} error={errors.fullName} autoComplete="name" required />
        <TextField
          id="document-number"
          label="Número de documento"
          inputMode="numeric"
          value={documentNumber}
          onChange={(event) => setDocumentNumber(digitsOnly(event.target.value, 12))}
          error={errors.documentNumber}
          hint="Solo números (DNI u otro documento numérico)."
          required
        />
        <TextField
          id="birth-date"
          label="Fecha de nacimiento"
          type="date"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          error={errors.birthDate}
          required
        />
        <CheckField id="filiation-confirmed" label="Los datos coinciden con la orden de internamiento" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} error={errors.confirmed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {success ? <Feedback tone="success">{success}</Feedback> : null}
        <button className="button" type="submit" disabled={pending}>Validar filiación</button>
      </form>
      <StepNav role={role} encounter={encounter} viewingStep="filiacion" canContinue={advanced} />
    </Sheet>
  );
}
