import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import type { Encounter } from "../../admission-census/domain/encounter";
import { stepPath } from "../../admission-census/domain/steps";

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
    if (!orderNumber.trim()) next.orderNumber = "El número de orden es obligatorio.";
    if (!patientName.trim()) next.patientName = "El nombre del paciente es obligatorio.";
    if (!documentNumber.trim()) next.documentNumber = "El documento es obligatorio.";
    if (!coveragePlan.trim()) next.coveragePlan = "El plan de cobertura es obligatorio.";
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
        <TextField id="reg-order" label="Número de orden" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} error={errors.orderNumber} />
        <TextField id="reg-name" label="Nombre del paciente" value={patientName} onChange={(event) => setPatientName(event.target.value)} error={errors.patientName} />
        <TextField id="reg-document" label="Número de documento" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} error={errors.documentNumber} />
        <TextField id="reg-origin" label="Servicio de origen" value={originService} onChange={(event) => setOriginService(event.target.value)} />
        <TextField id="reg-payer" label="Pagador" value={coveragePayer} onChange={(event) => setCoveragePayer(event.target.value)} />
        <SelectField id="reg-coverage" label="Estado de cobertura" value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)}>
          <option value="aprobada">Aprobada</option>
          <option value="pendiente">Pendiente</option>
          <option value="rechazada">Rechazada</option>
        </SelectField>
        <TextField id="reg-plan" label="Plan de cobertura" value={coveragePlan} onChange={(event) => setCoveragePlan(event.target.value)} error={errors.coveragePlan} />
        <TextField id="reg-reason" label="Motivo de internamiento" value={reason} onChange={(event) => setReason(event.target.value)} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <button className="button" type="submit" disabled={pending}>Registrar e iniciar</button>
      </form>
      <p><Link to="/pacientes">Volver al censo</Link></p>
    </Sheet>
  );
}
