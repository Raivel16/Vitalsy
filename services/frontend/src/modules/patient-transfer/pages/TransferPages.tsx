import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { BarcodeScanner } from "../components/BarcodeScanner";

type TransferOrder = {
  transfer: { orderNumber: string; patientName: string; room: string; bed: string; service: string };
};

function NeedPatient({ title }: { title: string }) {
  return (
    <Sheet kicker="Celador" title={title}>
      <Feedback tone="info">
        Abra un paciente desde el censo para trabajar este paso con su código propio.
      </Feedback>
      <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
    </Sheet>
  );
}

export function TransferOrderPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "celador";
  const [orderNumber, setOrderNumber] = useState("");
  const [result, setResult] = useState<TransferOrder | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setResult(null);
    setError("");
    setNotice("");
    setAdvanced(false);
    setOrderNumber(encounter?.transferOrderNumber ?? "");
  }, [encounter?.encounterId, encounter?.transferOrderNumber]);

  if (!encounter) return <NeedPatient title="Orden de traslado a piso" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await api<TransferOrder>(
        `/api/v1/hospital-admission/transfer-orders/${encodeURIComponent(orderNumber.trim())}`,
      );
      setResult(data);
    } catch (caught) {
      setResult(null);
      setError(errorText(caught, "No se pudo consultar el traslado."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmTransfer() {
    setPending(true);
    setError("");
    try {
      if (encounter.currentStep === "traslado") {
        const next = await advanceEncounter(encounter.encounterId, "traslado");
        applyEncounter(next);
      }
      setNotice("Traslado confirmado.");
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo confirmar el traslado."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Celador" title="Orden de traslado a piso">
      <p className="lead">Confirme habitación y lecho de {encounter.patientName} antes de movilizarlo.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="transfer-order" label="Número de traslado" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
        <button className="button" type="submit">Consultar traslado</button>
      </form>
      {loading ? <p role="status">Cargando orden de traslado.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {result ? (
        <section className="bed-card">
          <h3>{result.transfer.patientName}</h3>
          <p>Habitación {result.transfer.room}</p>
          <p>Lecho {result.transfer.bed}</p>
          <p>{result.transfer.service}</p>
          <button className="button" type="button" onClick={() => void confirmTransfer()} disabled={pending || advanced}>
            Confirmar traslado
          </button>
        </section>
      ) : null}
      <StepNav role={role} encounter={encounter} viewingStep="traslado" canContinue={advanced} />
    </Sheet>
  );
}

export function WristbandVerifyPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "celador";
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setMessage("");
    setError("");
    setAdvanced(false);
    setCode(encounter?.wristbandCode ?? "");
  }, [encounter?.encounterId, encounter?.wristbandCode]);

  const onScan = useCallback((scanned: string) => {
    setCode(scanned);
  }, []);

  if (!encounter) return <NeedPatient title="Verificación de identidad" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setPending(true);
    try {
      const data = await api<{ identity: { patientName: string } }>("/api/v1/hospital-admission/wristbands/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setMessage(`Identidad confirmada: ${data.identity.patientName}.`);
      if (encounter.currentStep === "identidad") {
        const next = await advanceEncounter(encounter.encounterId, "identidad");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo verificar el brazalete."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Celador" title="Verificación de identidad">
      <p className="lead">Confirme el brazalete de {encounter.patientName} antes del traslado.</p>
      <BarcodeScanner onScan={onScan} />
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="wristband-code" label="Código del brazalete" value={code} onChange={(event) => setCode(event.target.value)} />
        <button className="button" type="submit" disabled={pending}>Verificar brazalete</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {message ? <Feedback tone="success">{message}</Feedback> : null}
      <StepNav role={role} encounter={encounter} viewingStep="identidad" canContinue={advanced} />
    </Sheet>
  );
}

export function FloorReceptionPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermeria";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Recepción física en piso">
        <Feedback tone="info">Abra un paciente desde el censo para confirmar su recepción.</Feedback>
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      </Sheet>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const data = await api<{ reception: { status: string } }>("/api/v1/hospital-admission/floor-receptions", {
        method: "POST",
        body: JSON.stringify({
          encounterId: encounter.encounterId,
          room: encounter.location.room,
          bed: encounter.location.bed,
          confirmed: true,
        }),
      });
      setStatus(data.reception.status);
      setError("");
      if (encounter.currentStep === "recepcion") {
        const next = await advanceEncounter(encounter.encounterId, "recepcion");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo confirmar la recepción."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Enfermería" title="Recepción física en piso">
      <p className="lead">Confirme que {encounter.patientName} llegó a la habitación y al lecho asignados.</p>
      <form onSubmit={onSubmit}>
        <button className="button" type="submit" disabled={pending}>Confirmar recepción</button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {status ? <Feedback tone="success">Paciente {status} en el lecho asignado.</Feedback> : null}
      <p><Link to={`/piso/reubicacion?ingreso=${encodeURIComponent(encounter.encounterId)}`}>Registrar reubicación</Link></p>
      <StepNav role={role} encounter={encounter} viewingStep="recepcion" canContinue={advanced} />
    </Sheet>
  );
}

export function RelocationPage() {
  const encounter = useEncounter();
  const [reason, setReason] = useState("");
  const [room, setRoom] = useState("");
  const [bed, setBed] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Reubicación del paciente">
        <Feedback tone="info">Abra un paciente desde el censo para registrar la reubicación.</Feedback>
        <p><Link className="button" to="/pacientes">Ir a pacientes</Link></p>
      </Sheet>
    );
  }

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
        body: JSON.stringify({
          encounterId: encounter.encounterId,
          reason,
          requestedRoom: room,
          requestedBed: bed,
        }),
      });
      setNotice(`Reubicación notificada a la central. Habitación ${room}, lecho ${bed}.`);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la reubicación."));
    }
  }

  return (
    <Sheet kicker="Enfermería" title="Reubicación del paciente">
      <p className="lead">Registre la discrepancia de lecho de {encounter.patientName} y avise a la central de camas.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="relocation-reason" label="Motivo de la discrepancia" value={reason} onChange={(event) => setReason(event.target.value)} error={errors.reason} />
        <TextField id="requested-room" label="Habitación solicitada" value={room} onChange={(event) => setRoom(event.target.value)} error={errors.room} />
        <TextField id="requested-bed" label="Lecho solicitado" value={bed} onChange={(event) => setBed(event.target.value)} error={errors.bed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {notice ? <Feedback tone="success">{notice}</Feedback> : null}
        <button className="button" type="submit">Notificar reubicación</button>
      </form>
      <p><Link to={`/piso/recepcion?ingreso=${encodeURIComponent(encounter.encounterId)}`}>Volver a recepción</Link></p>
    </Sheet>
  );
}
