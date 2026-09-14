import { type FormEvent, useState } from "react";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type AdmissionOrder = {
  order: {
    orderNumber: string;
    originService: string;
    requestingPhysician: string;
    reason: string;
    patient: { fullName: string; documentType: string; documentNumber: string; birthDate: string; sex: string };
    coverage: { payer: string; status: string; plan: string };
  };
};

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
      setError(errorText(caught, "No se pudo consultar la orden."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Orden de internamiento">
      <p className="lead">Consulte la orden digital enviada por el servicio emisor.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="order-number" label="Número de orden" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required />
        <button className="button" type="submit">Consultar orden</button>
      </form>
      {loading ? <p role="status">Cargando orden de internamiento.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {!loading && !error && !result ? <p className="empty">Ingrese el número de orden para iniciar la consulta.</p> : null}
      {result ? (
        <section className="result-block">
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
