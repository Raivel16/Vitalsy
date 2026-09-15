import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Barcode } from "../components/Barcode";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { advanceEncounter, pathAfterAdvance } from "../../admission-census/domain/advance";
import { useAuth } from "../../../app/AuthProvider";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";

export function WristbandPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Brazalete de identificación">
        <Feedback tone="info">Abra un paciente desde el censo para emitir su brazalete.</Feedback>
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      </Sheet>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const data = await api<{ wristband: { code: string } }>("/api/v1/hospital-admission/wristbands", {
        method: "POST",
        body: JSON.stringify({ encounterId: encounter.encounterId }),
      });
      setCode(data.wristband.code);
      if (encounter.currentStep === "brazalete") {
        const next = await advanceEncounter(encounter.encounterId, "brazalete");
        applyEncounter(next);
        navigate(pathAfterAdvance(next, user?.role ?? "admision"));
      }
    } catch (caught) {
      setError(errorText(caught, "No se pudo emitir el brazalete."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Brazalete de identificación">
      <p className="lead">Genere el brazalete de {encounter.patientName} y verifique el código antes de entregarlo.</p>
      <form onSubmit={onSubmit}>
        <button className="button" type="submit" disabled={pending}>Emitir brazalete</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {code ? (
        <div className="wristband">
          <span className="wrist-hole" aria-hidden="true" />
          <div>
            <p className="wrist-name">{encounter.patientName}</p>
            <p className="wrist-code">{code}</p>
            <Barcode value={code} />
          </div>
          <span className="wrist-hole" aria-hidden="true" />
        </div>
      ) : null}
    </Sheet>
  );
}

export function RecordPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recordId, setRecordId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Expediente clínico de ingreso">
        <Feedback tone="info">Abra un paciente desde el censo para aperturar su expediente.</Feedback>
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      </Sheet>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const data = await api<{ record: { recordId: string } }>("/api/v1/hospital-admission/clinical-records", {
        method: "POST",
        body: JSON.stringify({ encounterId: encounter.encounterId }),
      });
      setRecordId(data.record.recordId);
      setError("");
      if (encounter.currentStep === "expediente") {
        const next = await advanceEncounter(encounter.encounterId, "expediente");
        applyEncounter(next);
        navigate(pathAfterAdvance(next, user?.role ?? "admision"));
      }
    } catch (caught) {
      setError(errorText(caught, "No se pudo aperturar el expediente."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Expediente clínico de ingreso">
      <p className="lead">Abra el expediente clínico de {encounter.patientName}.</p>
      <form onSubmit={onSubmit}>
        <button className="button" type="submit" disabled={pending}>Aperturar expediente</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {recordId ? <Feedback tone="success">Expediente abierto. Identificador {recordId}.</Feedback> : null}
    </Sheet>
  );
}

export function ConsentPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signerName, setSignerName] = useState("");
  const [relationship, setRelationship] = useState("familiar");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Consentimiento informado">
        <Feedback tone="info">Abra un paciente desde el censo para registrar el consentimiento.</Feedback>
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      </Sheet>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!signerName.trim()) next.signerName = "El nombre de quien firma es obligatorio.";
    if (!accepted) next.accepted = "Debe aceptar el consentimiento informado.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const data = await api<{ consent: { status: string } }>("/api/v1/hospital-admission/informed-consents", {
        method: "POST",
        body: JSON.stringify({
          encounterId: encounter.encounterId,
          signerName,
          relationship,
          accepted,
        }),
      });
      setSigned(data.consent.status);
      setError("");
      if (encounter.currentStep === "consentimiento") {
        const advanced = await advanceEncounter(encounter.encounterId, "consentimiento");
        applyEncounter(advanced);
        navigate(pathAfterAdvance(advanced, user?.role ?? "admision"));
      }
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar el consentimiento."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Consentimiento informado">
      <p className="lead">Registre la aceptación del consentimiento de {encounter.patientName}.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="signer-name" label="Nombre de quien firma" value={signerName} onChange={(event) => setSignerName(event.target.value)} error={errors.signerName} />
        <TextField id="relationship" label="Relación con el paciente" value={relationship} onChange={(event) => setRelationship(event.target.value)} />
        <CheckField id="consent-accepted" label="Acepto el consentimiento informado" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} error={errors.accepted} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {signed ? <Feedback tone="success">Consentimiento {signed}.</Feedback> : null}
        <button className="button" type="submit" disabled={pending}>Registrar consentimiento</button>
      </form>
    </Sheet>
  );
}
