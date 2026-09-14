import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Barcode } from "../components/Barcode";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

export function WristbandPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data = await api<{ wristband: { code: string } }>("/api/v1/hospital-admission/wristbands", {
        method: "POST",
        body: JSON.stringify({ encounterId: "ENC-0001", patientName: "Ana María Quispe Rojas" }),
      });
      setCode(data.wristband.code);
    } catch (caught) {
      setError(errorText(caught, "No se pudo emitir el brazalete."));
    }
  }

  return (
    <Sheet kicker="Admisión" title="Brazalete de identificación">
      <p className="lead">Genere el brazalete de identificación y verifique el código antes de entregarlo.</p>
      <form onSubmit={onSubmit}>
        <button className="button" type="submit">Emitir brazalete</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {code ? (
        <div className="wristband">
          <span className="wrist-hole" aria-hidden="true" />
          <div>
            <p className="wrist-name">Ana María Quispe Rojas</p>
            <p className="wrist-code">{code}</p>
            <Barcode value={code} />
          </div>
          <span className="wrist-hole" aria-hidden="true" />
        </div>
      ) : null}
      {code ? <p><Link to="/admision/expediente">Abrir expediente</Link></p> : null}
    </Sheet>
  );
}

export function RecordPage() {
  const [recordId, setRecordId] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ record: { recordId: string } }>("/api/v1/hospital-admission/clinical-records", {
        method: "POST",
        body: JSON.stringify({ encounterId: "ENC-0001" }),
      });
      setRecordId(data.record.recordId);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo aperturar el expediente."));
    }
  }

  return (
    <Sheet kicker="Admisión" title="Expediente clínico de ingreso">
      <p className="lead">Abra el expediente clínico de ingreso una vez validados los datos y la cobertura.</p>
      <form onSubmit={onSubmit}>
        <button className="button" type="submit">Aperturar expediente</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {recordId ? <Feedback tone="success">Expediente abierto. Identificador {recordId}.</Feedback> : null}
      {recordId ? <p><Link to="/admision/consentimiento">Registrar consentimiento</Link></p> : null}
    </Sheet>
  );
}

export function ConsentPage() {
  const [signerName, setSignerName] = useState("");
  const [relationship, setRelationship] = useState("familiar");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!signerName.trim()) next.signerName = "El nombre de quien firma es obligatorio.";
    if (!accepted) next.accepted = "Debe aceptar el consentimiento informado.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const data = await api<{ consent: { status: string } }>("/api/v1/hospital-admission/informed-consents", {
        method: "POST",
        body: JSON.stringify({ signerName, relationship, accepted }),
      });
      setSigned(data.consent.status);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar el consentimiento."));
    }
  }

  return (
    <Sheet kicker="Admisión" title="Consentimiento informado">
      <p className="lead">Registre la aceptación del consentimiento informado en el terminal.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="signer-name" label="Nombre de quien firma" value={signerName} onChange={(event) => setSignerName(event.target.value)} error={errors.signerName} />
        <TextField id="relationship" label="Relación con el paciente" value={relationship} onChange={(event) => setRelationship(event.target.value)} />
        <CheckField id="consent-accepted" label="Acepto el consentimiento informado" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} error={errors.accepted} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {signed ? <Feedback tone="success">Consentimiento {signed}.</Feedback> : null}
        <button className="button" type="submit">Registrar consentimiento</button>
      </form>
    </Sheet>
  );
}
