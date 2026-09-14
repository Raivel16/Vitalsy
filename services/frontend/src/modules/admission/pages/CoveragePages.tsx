import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { SelectField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { useEncounterState, type CoverageStatus } from "../../admission-census/EncounterContext";

const COPY: Record<CoverageStatus, string> = {
  aprobada: "La cobertura permite continuar la admisión.",
  pendiente: "Hay un trámite pendiente antes de completar el ingreso.",
  rechazada: "La cobertura fue rechazada. Derive el trámite antes de continuar.",
};

export function CoveragePage() {
  const { encounter, coverageStatus, setCoverageStatus } = useEncounterState();
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const [status, setStatus] = useState<CoverageStatus>("aprobada");

  useEffect(() => {
    if (coverageStatus) setStatus(coverageStatus);
    else if (encounter?.coverage.status === "aprobada" || encounter?.coverage.status === "pendiente" || encounter?.coverage.status === "rechazada") {
      setStatus(encounter.coverage.status);
    }
  }, [coverageStatus, encounter]);

  function changeStatus(next: CoverageStatus) {
    setStatus(next);
    setCoverageStatus(next);
  }

  const referralTo = ingreso
    ? `/admision/cobertura/derivacion?ingreso=${encodeURIComponent(ingreso)}`
    : "/admision/cobertura/derivacion";

  return (
    <Sheet kicker="Admisión" title="Cobertura sanitaria">
      <p className="lead">
        {encounter
          ? `Revise la cobertura de ${encounter.patientName}. Si la aprueba, confirme el paso en el censo para continuar.`
          : "Revise el estado de la cobertura. Si hay un trámite pendiente, derive el caso a caja o a trabajo social."}
      </p>
      <SelectField id="coverage-scenario" label="Estado de cobertura" value={status} onChange={(event) => changeStatus(event.target.value as CoverageStatus)}>
        <option value="aprobada">Aprobada</option>
        <option value="pendiente">Pendiente</option>
        <option value="rechazada">Rechazada</option>
      </SelectField>
      <p className={`stamp stamp-${status}`} role="status" aria-label={`Cobertura ${status}`}>
        <span aria-hidden="true">{status === "aprobada" ? "✓" : status === "pendiente" ? "!" : "×"}</span>
        Cobertura {status}
      </p>
      <p>{COPY[status]}</p>
      {status === "aprobada" ? (
        <Feedback tone="info">Con cobertura aprobada, confirme el paso en el censo para emitir el brazalete.</Feedback>
      ) : (
        <p><Link to={referralTo}>Derivar trámite</Link></p>
      )}
    </Sheet>
  );
}

export function ReferralPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const { encounter } = useEncounterState();
  const [relativeName, setRelativeName] = useState("");
  const [relativePhone, setRelativePhone] = useState("");
  const [destination, setDestination] = useState("trabajo_social");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const coverageTo = ingreso
    ? `/admision/cobertura?ingreso=${encodeURIComponent(ingreso)}`
    : "/admision/cobertura";

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
      setResult(`Derivación registrada a ${place}. El familiar queda notificado.`);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la derivación."));
    }
  }

  return (
    <Sheet kicker="Admisión" title="Derivación de cobertura">
      <p className="lead">
        {encounter
          ? `Registre el trámite de cobertura de ${encounter.patientName} y el aviso al familiar.`
          : "Registre el trámite pendiente y el aviso al familiar o cuidador."}
      </p>
      <p><Link to={coverageTo}>Volver a cobertura</Link></p>
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
