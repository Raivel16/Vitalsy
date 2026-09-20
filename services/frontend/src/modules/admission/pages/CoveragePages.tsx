import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { SelectField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounterState, type CoverageStatus } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { digitsOnly, phoneNumberError, requiredText } from "../../../shared/validation/inputRules";

const COPY: Record<CoverageStatus, string> = {
  aprobada: "La cobertura permite continuar la admisión.",
  pendiente: "Hay un trámite pendiente antes de completar el ingreso.",
  rechazada: "La cobertura fue rechazada. Derive el trámite antes de continuar.",
};

export function CoveragePage() {
  const { encounter, coverageStatus, setCoverageStatus, applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const [status, setStatus] = useState<CoverageStatus>("aprobada");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

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

  async function registerCoverage() {
    if (!encounter) {
      setError("Abra un paciente desde el censo para registrar la cobertura.");
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    try {
      const step = encounter.currentStep === "derivacion" ? "derivacion" : "cobertura";
      const next = await advanceEncounter(encounter.encounterId, step, status);
      applyEncounter(next);
      setNotice("Cobertura registrada.");
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la cobertura."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Cobertura sanitaria">
      <p className="lead">
        {encounter
          ? `Revise la cobertura de ${encounter.patientName}. Al registrar, el ingreso avanza según el estado elegido.`
          : "Abra un paciente desde el censo para validar su cobertura."}
      </p>
      {!encounter ? (
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      ) : (
        <>
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
          {error ? <Feedback tone="error">{error}</Feedback> : null}
          {notice ? <Feedback tone="success">{notice}</Feedback> : null}
          <div className="actions">
            <button className="button" type="button" onClick={() => void registerCoverage()} disabled={pending}>
              Registrar cobertura
            </button>
            {status !== "aprobada" ? <Link to={referralTo}>Derivar trámite</Link> : null}
          </div>
          <StepNav role={role} encounter={encounter} viewingStep="cobertura" canContinue={advanced} />
        </>
      )}
    </Sheet>
  );
}

export function ReferralPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const { encounter, applyEncounter } = useEncounterState();
  const [relativeName, setRelativeName] = useState("");
  const [relativePhone, setRelativePhone] = useState("");
  const [destination, setDestination] = useState("trabajo_social");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const coverageTo = ingreso
    ? `/admision/cobertura?ingreso=${encodeURIComponent(ingreso)}`
    : "/admision/cobertura";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const nameIssue = requiredText(relativeName, "El nombre del familiar es obligatorio.");
    if (nameIssue) next.relativeName = nameIssue;
    const phoneIssue = phoneNumberError(relativePhone, { label: "El teléfono del familiar" });
    if (phoneIssue) next.relativePhone = phoneIssue;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await api("/api/v1/hospital-admission/coverage/referrals", {
        method: "POST",
        body: JSON.stringify({
          encounterId: encounter?.encounterId,
          destination,
          relativeName,
          relativePhone: relativePhone.trim(),
          note,
        }),
      });
      const place = destination === "caja" ? "caja" : "trabajo social";
      setResult(`Derivación registrada a ${place}. El familiar queda notificado.`);
      setError("");
      if (encounter && (encounter.currentStep === "cobertura" || encounter.currentStep === "derivacion")) {
        const advanced = await advanceEncounter(encounter.encounterId, encounter.currentStep, "pendiente");
        applyEncounter(advanced);
      }
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la derivación."));
    } finally {
      setPending(false);
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
        <TextField id="relative-name" label="Nombre del familiar" value={relativeName} onChange={(event) => setRelativeName(event.target.value)} error={errors.relativeName} required />
        <TextField
          id="relative-phone"
          label="Teléfono del familiar"
          inputMode="numeric"
          pattern="\d{7,15}"
          value={relativePhone}
          onChange={(event) => setRelativePhone(digitsOnly(event.target.value, 15))}
          error={errors.relativePhone}
          hint="Solo dígitos, de 7 a 15."
          required
        />
        <TextAreaField id="referral-note" label="Observación (opcional)" value={note} onChange={(event) => setNote(event.target.value)} hint="Puede dejarse vacío." />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {result ? <Feedback tone="success">{result}</Feedback> : null}
        <button className="button" type="submit" disabled={pending}>Registrar derivación</button>
      </form>
    </Sheet>
  );
}
