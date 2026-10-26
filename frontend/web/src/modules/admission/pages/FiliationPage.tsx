import { type SyntheticEvent, useEffect, useState } from "react";
import { IconUserCheck } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { readDraft, writeDraft } from "../domain/admissionDraft";
import { useAuth } from "../../../app/AuthProvider";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { StepNav } from "../../admission-census/ui/StepNav";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
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
  const [birthDate, setBirthDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    if (!encounter) return;
    const saved = encounter.clinical?.filiation ?? readDraft<{
      fullName?: string;
      documentNumber?: string;
      birthDate?: string;
      confirmed?: boolean;
    }>(encounter.encounterId, "filiation");
    setFullName(saved?.fullName || encounter.patientName);
    setDocumentNumber(digitsOnly(saved?.documentNumber || encounter.documentNumber));
    setBirthDate(saved?.birthDate ?? "");
    setConfirmed(Boolean(saved?.confirmed));
    if (saved?.confirmed) {
      setAdvanced(true);
      setSuccess("Filiación validada.");
    }
  }, [encounter]);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Datos filiatorios" clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para validar su filiación." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: SyntheticEvent) {
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
          encounterId: activeEncounter.encounterId,
          fullName,
          documentNumber,
          birthDate,
          confirmed,
        }),
      });
      writeDraft(activeEncounter.encounterId, "filiation", {
        fullName, documentNumber, birthDate, confirmed,
      });
      setSuccess("Filiación validada.");
      if (activeEncounter.currentStep === "filiacion") {
        const updated = await advanceEncounter(activeEncounter.encounterId, "filiacion");
        applyEncounter(updated);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo validar la filiación."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión hospitalaria" title="Datos filiatorios" clinic="form">
      <p className="lead">Verifique y valide la identidad del paciente con su documento oficial presentado en ventanilla.</p>
      <div className="admit-callout">
        <strong>Cotejo dactiloscópico y visual</strong>
        <p>Asegúrese de constatar fecha de caducidad física y correspondencia del holograma de seguridad del DNI o carnet de extranjería.</p>
      </div>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <TextField
            id="full-name"
            label="Nombre completo del paciente"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            error={errors.fullName}
            hint="Conforme a partida registral o historial unificado."
            autoComplete="name"
            wide
            required
          />
          <TextField
            id="document-number"
            label="Número de documento"
            inputMode="numeric"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(digitsOnly(event.target.value, 12))}
            error={errors.documentNumber}
            hint="Solo dígitos (sin puntos ni guiones)."
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
        </div>
        <CheckField
          id="filiation-confirmed"
          className="admit-check"
          label="Confirmo que los datos coinciden con el documento presentado"
          description="Declaro bajo responsabilidad de admisión que el documento físico o digital fue validado."
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          error={errors.confirmed}
        />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {success ? <Feedback tone="success">{success}</Feedback> : null}
        <div className="form-actions-bar">
          <span />
          <Button type="submit" pending={pending} disabled={pending || advanced}><IconUserCheck size={16} /> Validar filiación</Button>
        </div>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="filiacion" canContinue={advanced} />
    </Sheet>
  );
}
