import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type TransferOrder = {
  transfer: { orderNumber: string; patientName: string; room: string; bed: string; service: string };
};

export function TransferOrderPage() {
  const [orderNumber, setOrderNumber] = useState("OT-2026-0001");
  const [result, setResult] = useState<TransferOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<TransferOrder>(
        `/api/v1/hospital-admission/transfer-orders/${encodeURIComponent(orderNumber.trim())}`,
      );
      setResult(data);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "No se pudo consultar el traslado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet kicker="RF-07 · Celador" title="Orden de traslado a piso">
      <p className="lead">Confirme habitación y lecho antes de movilizar al paciente.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="transfer-order" label="Número de traslado" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
        <button className="button" type="submit">Consultar traslado</button>
      </form>
      {loading ? <p role="status">Cargando orden de traslado.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {result ? (
        <section className="bed-card">
          <p className="sim-note">Respuesta simulada.</p>
          <h3>{result.transfer.patientName}</h3>
          <p>Habitación {result.transfer.room}</p>
          <p>Lecho {result.transfer.bed}</p>
          <p>{result.transfer.service}</p>
          <p><Link to="/traslado/identidad">Verificar identidad</Link></p>
        </section>
      ) : null}
    </Sheet>
  );
}

export function WristbandVerifyPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const data = await api<{ identity: { patientName: string } }>("/api/v1/hospital-admission/wristbands/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setMessage(`Identidad confirmada: ${data.identity.patientName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo verificar el brazalete.");
    }
  }

  return (
    <Sheet kicker="RF-08 · Celador" title="Verificación de identidad">
      <p className="lead">Ingrese el código o use el escaneo simulado. No hay lector físico en esta fase.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="wristband-code" label="Código del brazalete" value={code} onChange={(event) => setCode(event.target.value)} />
        <div className="actions">
          <button className="button button-quiet" type="button" onClick={() => setCode("BRZ-0001-ANA")}>Simular escaneo</button>
          <button className="button" type="submit">Verificar brazalete</button>
        </div>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {message ? <Feedback tone="success">{message}</Feedback> : null}
    </Sheet>
  );
}

export function FloorReceptionPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ reception: { status: string } }>("/api/v1/hospital-admission/floor-receptions", {
        method: "POST",
        body: JSON.stringify({ encounterId: "ENC-0001", room: "312", bed: "B", confirmed: true }),
      });
      setStatus(data.reception.status);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo confirmar la recepción.");
    }
  }

  return (
    <Sheet kicker="RF-09 · Enfermería" title="Recepción física en piso">
      <p className="lead">Paciente de demostración: Ana María Quispe Rojas. Habitación 312, lecho B.</p>
      <form onSubmit={onSubmit}>
        <button className="button" type="submit">Confirmar recepción</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {status ? <Feedback tone="success">Paciente {status} en el lecho asignado.</Feedback> : null}
      {status ? <p><Link to="/piso/reubicacion">Registrar reubicación</Link></p> : null}
    </Sheet>
  );
}

export function RelocationPage() {
  const [reason, setReason] = useState("");
  const [room, setRoom] = useState("");
  const [bed, setBed] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!reason.trim()) next.reason = "El motivo de la discrepancia es obligatorio.";
    if (!room.trim()) next.room = "La habitación solicitada es obligatoria.";
    if (!bed.trim()) next.bed = "El lecho solicitado es obligatorio.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await api("/api/v1/hospital-admission/relocations", {
        method: "POST",
        body: JSON.stringify({ encounterId: "ENC-0001", reason, requestedRoom: room, requestedBed: bed }),
      });
      setNotice(`Reubicación notificada a la central. Habitación ${room}, lecho ${bed}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo registrar la reubicación.");
    }
  }

  return (
    <Sheet kicker="RF-10 · Enfermería" title="Reubicación del paciente">
      <p className="lead">Registre la discrepancia de lecho. La notificación a la central es simulada.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="relocation-reason" label="Motivo de la discrepancia" value={reason} onChange={(event) => setReason(event.target.value)} error={errors.reason} />
        <TextField id="requested-room" label="Habitación solicitada" value={room} onChange={(event) => setRoom(event.target.value)} error={errors.room} />
        <TextField id="requested-bed" label="Lecho solicitado" value={bed} onChange={(event) => setBed(event.target.value)} error={errors.bed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {notice ? <Feedback tone="success">{notice}</Feedback> : null}
        <button className="button" type="submit">Notificar reubicación</button>
      </form>
    </Sheet>
  );
}
