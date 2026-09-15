import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { RoleStepLinks } from "../../admission-census/ui/RoleStepLinks";
import { StepNav } from "../../admission-census/ui/StepNav";
import { errorText } from "../../../app/userMessage";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type AdmissionOrder = {
  order: {
    orderNumber: string;
    originService: string;
    requestingPhysician: string | null;
    reason: string | null;
    patient: { fullName: string; documentType: string; documentNumber: string; birthDate?: string; sex?: string };
    coverage: { payer: string; status: string; plan: string };
  };
};

export function AdmissionOrderPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<AdmissionOrder | null>(null);
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setResult(null);
    setError("");
    setNotice("");
    setAdvanced(false);
    setOrderNumber(encounter?.orderNumber ?? "");
  }, [encounter?.encounterId, encounter?.orderNumber]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api<AdmissionOrder>(
        `/api/v1/hospital-admission/admission-orders/${encodeURIComponent(orderNumber.trim())}`,
      );
      setResult(data);
    } catch (caught) {
      setError(errorText(caught, "No se pudo consultar la orden."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmOrder() {
    if (!encounter) return;
    setPending(true);
    setError("");
    try {
      if (encounter.currentStep === "orden") {
        const next = await advanceEncounter(encounter.encounterId, "orden");
        applyEncounter(next);
      }
      setNotice("Orden confirmada.");
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo confirmar la orden."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Orden de internamiento">
      {encounter ? <RoleStepLinks role={role} encounter={encounter} viewingStep="orden" /> : null}
      <p className="lead">
        {encounter
          ? `Consulte la orden de ${encounter.patientName}.`
          : "Consulte la orden digital enviada por el servicio emisor o registre un ingreso manual."}
      </p>
      {!encounter ? (
        <p><Link className="button" to="/pacientes/nuevo">Registrar ingreso manual</Link></p>
      ) : null}
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="order-number" label="Número de orden" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required />
        <button className="button" type="submit">Consultar orden</button>
      </form>
      {loading ? <p role="status">Cargando orden de internamiento.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {result ? (
        <section className="result-block">
          <h3>{result.order.patient.fullName}</h3>
          <dl className="facts">
            <div><dt>Orden</dt><dd>{result.order.orderNumber}</dd></div>
            <div><dt>Origen</dt><dd>{result.order.originService}</dd></div>
            <div><dt>Médico emisor</dt><dd>{result.order.requestingPhysician ?? "No indicado"}</dd></div>
            <div><dt>Motivo</dt><dd>{result.order.reason ?? "No indicado"}</dd></div>
            <div><dt>Documento</dt><dd>{result.order.patient.documentType} {result.order.patient.documentNumber}</dd></div>
            <div><dt>Cobertura</dt><dd>{result.order.coverage.payer} · {result.order.coverage.status}</dd></div>
          </dl>
          {encounter ? (
            <button className="button" type="button" onClick={() => void confirmOrder()} disabled={pending || advanced}>
              Confirmar orden
            </button>
          ) : (
            <p><Link className="button" to="/pacientes">Ir al censo</Link></p>
          )}
        </section>
      ) : null}
      {encounter ? <StepNav role={role} encounter={encounter} viewingStep="orden" canContinue={advanced} /> : null}
    </Sheet>
  );
}
