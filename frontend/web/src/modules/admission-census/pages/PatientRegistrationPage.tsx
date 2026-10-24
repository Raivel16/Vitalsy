import { type SyntheticEvent, useState } from "react";
import { IconAlertCircle, IconBuildingBank, IconEraser, IconHash, IconHourglass, IconId, IconIdBadge2, IconShield, IconUserCheck, IconX } from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { SelectField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import type { Encounter } from "../../admission-census/domain/encounter";
import { stepPath } from "../../admission-census/domain/steps";
import { digitsOnly, documentNumberError, requiredText } from "../../../shared/validation/inputRules";

const ORIGIN_SERVICES = [
  "Emergencia adultos",
  "Emergencia pediátrica",
  "Consulta externa",
  "Consultorios externos",
  "Derivación interhospitalaria",
  "Quirófano urgencias",
];

const PAYERS = [
  "SIS",
  "EsSalud",
  "SOAT",
  "EPS Rímac",
  "EPS Pacífico",
  "Particular",
];

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

  function clearFields() {
    setOrderNumber("");
    setPatientName("");
    setDocumentNumber("");
    setOriginService("Emergencia adultos");
    setCoveragePayer("SIS");
    setCoverageStatus("aprobada");
    setCoveragePlan("");
    setReason("");
    setErrors({});
    setError("");
  }

  async function onSubmit(event: SyntheticEvent) {
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
      void navigate(stepPath(data.encounter.currentStep, data.encounter.encounterId));
    } catch (error_) {
      setError(errorText(error_, "No se pudo registrar el ingreso."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet
      kicker="Admisión"
      title="Registrar ingreso"
      clinic="form"
      aside={<span className="sheet-badge">Protocolo Adm-01</span>}
    >
      <p className="lead">
        Cree manualmente un nuevo encuentro hospitalario para iniciar el flujo de admisión y asignación en piso.
      </p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <TextField
            id="reg-order"
            label="Número de orden"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            error={errors.orderNumber}
            hint="Correlativo interno del sistema de triaje."
            labelAside="Autoasignable"
            placeholder="Ej. OI-2026-0104"
            icon={<IconHash size={18} />}
            required
          />
          <TextField
            id="reg-document"
            label="Documento de identidad"
            inputMode="numeric"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(digitsOnly(event.target.value, 12))}
            error={errors.documentNumber}
            hint="Solo dígitos."
            labelAside="(Solo dígitos)"
            placeholder="DNI / Carnet extranjería"
            icon={errors.documentNumber ? <IconAlertCircle size={18} /> : <IconId size={18} />}
            required
          />
          <TextField
            id="reg-name"
            label="Nombre del paciente"
            value={patientName}
            onChange={(event) => setPatientName(event.target.value)}
            error={errors.patientName}
            hint="Registre según documento nacional oficial."
            placeholder="Apellidos y nombres completos"
            icon={<IconIdBadge2 size={18} />}
            wide
            required
          />
          <SelectField
            id="reg-origin"
            label="Servicio de origen"
            value={originService}
            onChange={(event) => setOriginService(event.target.value)}
            error={errors.originService}
            required
          >
            {ORIGIN_SERVICES.map((service) => (
              <option key={service} value={service}>{service}</option>
            ))}
          </SelectField>
          <SelectField
            id="reg-payer"
            label="Pagador asegurador"
            value={coveragePayer}
            onChange={(event) => setCoveragePayer(event.target.value)}
            error={errors.coveragePayer}
            icon={<IconBuildingBank size={18} />}
            required
          >
            {PAYERS.map((payer) => (
              <option key={payer} value={payer}>{payer}</option>
            ))}
          </SelectField>
          <SelectField id="reg-coverage" label="Estado de cobertura" value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)} icon={<IconHourglass size={18} />} required>
            <option value="aprobada">Aprobada</option>
            <option value="pendiente">Pendiente de verificación</option>
            <option value="rechazada">Rechazada</option>
          </SelectField>
          <TextField
            id="reg-plan"
            label="Plan de cobertura"
            value={coveragePlan}
            onChange={(event) => setCoveragePlan(event.target.value)}
            error={errors.coveragePlan}
            hint="Plan esencial de aseguramiento en salud."
            icon={<IconShield size={18} />}
            required
          />
          <TextAreaField
            id="reg-reason"
            label="Motivo de ingreso"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="Describa el motivo clínico de hospitalización."
            labelAside="Opcional · Síntesis de guardia"
            placeholder="Describa brevemente el motivo clínico de hospitalización, antecedentes inmediatos y condición basal del paciente."
            rows={3}
            wide
          />
        </div>
        <Feedback tone="info">
          Flujo de camas posterior. El registro no asigna ni solicita cama; Gestión de camas la confirma después.
        </Feedback>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <div className="form-actions-bar">
          <Button type="button" variant="quiet" onClick={() => void navigate("/pacientes")}><IconX size={16} /> Cancelar</Button>
          <div className="row-actions">
            <Button type="button" variant="quiet" onClick={clearFields}><IconEraser size={16} /> Limpiar campos</Button>
            <Button type="submit" pending={pending}><IconUserCheck size={16} /> Registrar</Button>
          </div>
        </div>
      </form>
    </Sheet>
  );
}
