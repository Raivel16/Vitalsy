import { type FormEvent, useState } from "react";
import { api } from "../../../app/api";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type AdmissionOrder = {
  simulated: boolean;
  order: {
    orderNumber: string;
    originService: string;
    requestingPhysician: string;
    reason: string;
    patient: { fullName: string; documentType: string; documentNumber: string; birthDate: string; sex: string };
    coverage: { payer: string; status: string; plan: string };
  };
};

const DEMOS = ["OI-2026-0001", "OI-2026-0002", "OI-2026-0003"];

export function AdmissionOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AdmissionOrder | null>(null);

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
      setError(caught instanceof Error ? caught.message : "No se pudo consultar la orden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet kicker="RF-01 · Admisión" title="Orden de internamiento">
      <p className="lead">Consulte la orden digital enviada por el servicio emisor. Las órdenes de demostración son {DEMOS.join(", ")}.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="order-number" label="Número de orden" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required />
        <div className="chip-row" aria-label="Órdenes de demostración">
          {DEMOS.map((demo) => (
            <button key={demo} type="button" className="chip" onClick={() => setOrderNumber(demo)}>
              Usar {demo}
            </button>
          ))}
        </div>
        <button className="button" type="submit">Consultar orden</button>
      </form>
      {loading ? <p role="status">Cargando orden de internamiento.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {!loading && !error && !result ? <p className="empty">Ingrese el número de orden para iniciar la consulta.</p> : null}
      {result ? (
        <section className="result-block">
          <p className="sim-note">Respuesta simulada. No proviene de un HIS real.</p>
          <h3>{result.order.patient.fullName}</h3>
          <dl className="facts">
            <div><dt>Orden</dt><dd>{result.order.orderNumber}</dd></div>
            <div><dt>Origen</dt><dd>{result.order.originService}</dd></div>
            <div><dt>Médico emisor</dt><dd>{result.order.requestingPhysician}</dd></div>
            <div><dt>Motivo</dt><dd>{result.order.reason}</dd></div>
            <div><dt>Documento</dt><dd>{result.order.patient.documentType} {result.order.patient.documentNumber}</dd></div>
            <div><dt>Cobertura</dt><dd>{result.order.coverage.payer} · {result.order.coverage.status}</dd></div>
          </dl>
        </section>
      ) : null}
    </Sheet>
  );
}
