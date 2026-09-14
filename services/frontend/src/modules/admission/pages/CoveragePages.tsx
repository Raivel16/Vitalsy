import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { SelectField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type CoverageStatus = "aprobada" | "pendiente" | "rechazada";

const COPY: Record<CoverageStatus, string> = {
  aprobada: "La cobertura permite continuar la admisión.",
  pendiente: "Hay un trámite pendiente antes de completar el ingreso.",
  rechazada: "La cobertura fue rechazada. Derive el trámite antes de continuar.",
};

export function CoveragePage() {
  const [status, setStatus] = useState<CoverageStatus>("aprobada");

  return (
    <Sheet kicker="RF-02 · RF-03 · Admisión" title="Cobertura sanitaria">
      <p className="lead">El estado se muestra con texto e icono. El selector cambia el escenario de demostración.</p>
      <SelectField id="coverage-scenario" label="Escenario de cobertura" value={status} onChange={(event) => setStatus(event.target.value as CoverageStatus)}>
        <option value="aprobada">Aprobada</option>
        <option value="pendiente">Pendiente</option>
        <option value="rechazada">Rechazada</option>
      </SelectField>
      <p className={`stamp stamp-${status}`} role="status" aria-label={`Cobertura ${status}`}>
        <span aria-hidden="true">{status === "aprobada" ? "✓" : status === "pendiente" ? "!" : "×"}</span>
        Cobertura {status}
      </p>
      <p>{COPY[status]}</p>
      <p><Link to="/admision/cobertura/derivacion">Derivar trámite</Link></p>
    </Sheet>
  );
}

export function ReferralPage() {
  const [relativeName, setRelativeName] = useState("");
  const [relativePhone, setRelativePhone] = useState("");
  const [destination, setDestination] = useState("trabajo_social");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!relativeName.trim()) next.relativeName = "El nombre del familiar es obligatorio.";
    if (!relativePhone.trim()) next.relativePhone = "El teléfono del familiar es obligatorio.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await api("/api/v1/hospital-admission/coverage/referrals", {
        method: "POST",
        body: JSON.stringify({ destination, relativeName, relativePhone, note }),
      });
      const place = destination === "caja" ? "caja" : "trabajo social";
      setResult(`Derivación registrada a ${place}. El familiar queda notificado en esta simulación.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo registrar la derivación.");
    }
  }

  return (
    <Sheet kicker="RF-03 · Admisión" title="Derivación de cobertura">
      <p className="lead">Registre el trámite pendiente y el aviso al familiar o cuidador.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <SelectField id="destination" label="Destino del trámite" value={destination} onChange={(event) => setDestination(event.target.value)}>
          <option value="caja">Caja</option>
          <option value="trabajo_social">Trabajo social</option>
        </SelectField>
        <TextField id="relative-name" label="Nombre del familiar" value={relativeName} onChange={(event) => setRelativeName(event.target.value)} error={errors.relativeName} />
        <TextField id="relative-phone" label="Teléfono del familiar" value={relativePhone} onChange={(event) => setRelativePhone(event.target.value)} error={errors.relativePhone} />
        <TextAreaField id="referral-note" label="Observación" value={note} onChange={(event) => setNote(event.target.value)} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {result ? <Feedback tone="success">{result}</Feedback> : null}
        <button className="button" type="submit">Registrar derivación</button>
      </form>
    </Sheet>
  );
}
