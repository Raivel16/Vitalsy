import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import type { Encounter } from "../../admission-census/domain/encounter";
import { stepPath } from "../../admission-census/domain/steps";
import { digitsOnly, documentNumberError, requiredText } from "../../../shared/validation/inputRules";

export function PatientRegistrationPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [originService, setOriginService] = useState("Emergencia adultos");
  const [coveragePayer, setCoveragePayer] = useState("SIS");
  const [coverageStatus, setCoverageStatus] = useState("aprobada");
  const [coveragePlan, setCoveragePlan] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const orderIssue = requiredText(orderNumber, "El número de orden es obligatorio.");
    if (orderIssue) next.orderNumber = orderIssue;
    const nameIssue = requiredText(patientName, "El nombre del paciente es obligatorio.");
    if (nameIssue) next.patientName = nameIssue;
    const documentIssue = documentNumberError(documentNumber, "El documento");
    if (documentIssue) next.documentNumber = documentIssue;
    const originIssue = requiredText(originService, "El servicio de origen es obligatorio.");
    if (originIssue) next.originService = originIssue;
    const payerIssue = requiredText(coveragePayer, "El pagador es obligatorio.");
    if (payerIssue) next.coveragePayer = payerIssue;
    const planIssue = requiredText(coveragePlan, "El plan de cobertura es obligatorio.");
    if (planIssue) next.coveragePlan = planIssue;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    setError("");
    try {
      const data = await api<{ encounter: Encounter }>("/api/v1/hospital-admission/encounters", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          patientName: patientName.trim(),
          documentNumber: documentNumber.trim(),
          originService,
          coveragePayer,
          coverageStatus,
          coveragePlan: coveragePlan.trim(),
          reason: reason.trim() || null,
          source: "manual",
        }),
      });
      navigate(stepPath(data.encounter.currentStep, data.encounter.encounterId));
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar el ingreso."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Registrar ingreso">
      <p className="lead">
        Alta manual de un paciente para iniciar la admisión. Los sistemas emisores también pueden enviar el mismo payload a la API de intake.
      </p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="reg-order" label="Número de orden" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} error={errors.orderNumber} required />
        <TextField id="reg-name" label="Nombre del paciente" value={patientName} onChange={(event) => setPatientName(event.target.value)} error={errors.patientName} required />
        <TextField
          id="reg-document"
          label="Número de documento"
          inputMode="numeric"
          value={documentNumber}
          onChange={(event) => setDocumentNumber(digitsOnly(event.target.value, 12))}
          error={errors.documentNumber}
          hint="Solo números."
          required
        />
        <TextField id="reg-origin" label="Servicio de origen" value={originService} onChange={(event) => setOriginService(event.target.value)} error={errors.originService} required />
        <TextField id="reg-payer" label="Pagador" value={coveragePayer} onChange={(event) => setCoveragePayer(event.target.value)} error={errors.coveragePayer} required />
        <SelectField id="reg-coverage" label="Estado de cobertura" value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)} required>
          <option value="aprobada">Aprobada</option>
          <option value="pendiente">Pendiente</option>
          <option value="rechazada">Rechazada</option>
        </SelectField>
        <TextField id="reg-plan" label="Plan de cobertura" value={coveragePlan} onChange={(event) => setCoveragePlan(event.target.value)} error={errors.coveragePlan} required />
        <TextField id="reg-reason" label="Motivo de internamiento (opcional)" value={reason} onChange={(event) => setReason(event.target.value)} hint="Puede dejarse vacío si no aplica." />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <Button type="submit" pending={pending}>Registrar e iniciar</Button>
      </form>
      <p><Link to="/pacientes">Volver al censo</Link></p>
    </Sheet>
  );
}
