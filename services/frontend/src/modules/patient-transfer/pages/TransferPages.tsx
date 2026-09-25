import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import type { Encounter } from "../../admission-census/domain/encounter";

type TransferOrder = {
  transfer: { orderNumber: string; patientName: string; room: string; bed: string; service: string };
};

function NeedPatient({ title }: { title: string }) {
  return (
    <Sheet kicker="Celador / Camillero" title={title}>
      <EmptyEncounter message="Abra un paciente desde el censo para trabajar este paso con su código propio." />
    </Sheet>
  );
}

export function TransferOrderPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "camillero";
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

  const activeEncounter = encounter;

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
      if (activeEncounter.currentStep === "traslado") {
        const next = await advanceEncounter(activeEncounter.encounterId, "traslado");
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
    <Sheet kicker="Celador / Camillero" title="Orden de traslado a piso">
      <p className="lead">Confirme habitación y lecho de {activeEncounter.patientName} antes de movilizarlo.</p>
      <form className="stack" onSubmit={onSubmit}>
        <TextField id="transfer-order" label="Número de traslado" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
        <Button type="submit">Consultar traslado</Button>
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
          <Button type="button" onClick={() => void confirmTransfer()} disabled={pending || advanced}>
            Confirmar traslado
          </Button>
        </section>
      ) : null}
      <StepNav role={role} encounter={activeEncounter} viewingStep="traslado" canContinue={advanced} />
    </Sheet>
  );
}

async function verifyWristbandCode(
  code: string,
  activeEncounter: Encounter,
  applyEncounter: (encounter: Encounter) => void,
): Promise<string> {
  const data = await api<{ identity: { patientName: string } }>("/api/v1/hospital-admission/wristbands/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (activeEncounter.currentStep === "identidad") {
    const next = await advanceEncounter(activeEncounter.encounterId, "identidad");
    applyEncounter(next);
  }
  return `Identidad confirmada: ${data.identity.patientName}.`;
}

export function WristbandVerifyPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "camillero";
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    setMessage("");
    setError("");
    setAdvanced(false);
    setCode(encounter?.wristbandCode ?? "");
  }, [encounter?.encounterId, encounter?.wristbandCode]);

  const runVerify = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !encounter || pendingRef.current) return;
    pendingRef.current = true;
    setCode(trimmed);
    setMessage("");
    setError("");
    setPending(true);
    try {
      const notice = await verifyWristbandCode(trimmed, encounter, applyEncounter);
      setMessage(notice);
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo verificar el brazalete."));
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [applyEncounter, encounter]);

  const onScan = useCallback((scanned: string) => {
    void runVerify(scanned);
  }, [runVerify]);

  if (!encounter) return <NeedPatient title="Verificación de identidad" />;

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await runVerify(code);
  }

  return (
    <Sheet kicker="Celador / Camillero" title="Verificación de identidad">
      <p className="lead">Confirme el brazalete de {activeEncounter.patientName} antes del traslado.</p>
      <div className="identity-verify">
        <BarcodeScanner onScan={onScan} />
        <form className="stack" onSubmit={onSubmit}>
          <TextField id="wristband-code" label="Código del brazalete" value={code} onChange={(event) => setCode(event.target.value)} />
          <Button type="submit" pending={pending}>Verificar brazalete</Button>
        </form>
      </div>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {message ? <Feedback tone="success">{message}</Feedback> : null}
      <StepNav role={role} encounter={activeEncounter} viewingStep="identidad" canContinue={advanced} />
    </Sheet>
  );
}

export function FloorReceptionPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Enfermería" title="Recepción física en piso">
        <EmptyEncounter message="Abra un paciente desde el censo para confirmar su recepción." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const data = await api<{ reception: { status: string } }>("/api/v1/hospital-admission/floor-receptions", {
        method: "POST",
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          room: activeEncounter.location.room,
          bed: activeEncounter.location.bed,
          confirmed: true,
        }),
      });
      setStatus(data.reception.status);
      setError("");
      if (activeEncounter.currentStep === "recepcion") {
        const next = await advanceEncounter(activeEncounter.encounterId, "recepcion");
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
      <p className="lead">Confirme que {activeEncounter.patientName} llegó a la habitación y al lecho asignados.</p>
      <div className="stack reception-panel">
        <FormActions align="center">
          <form onSubmit={onSubmit}>
            <Button type="submit" pending={pending}>Confirmar recepción</Button>
          </form>
        </FormActions>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {status ? <Feedback tone="success">Paciente {status} en el lecho asignado.</Feedback> : null}
        <p className="actions actions-center">
          <Link to={`/piso/reubicacion?ingreso=${encodeURIComponent(activeEncounter.encounterId)}`}>Registrar reubicación</Link>
        </p>
      </div>
      <StepNav role={role} encounter={activeEncounter} viewingStep="recepcion" canContinue={advanced} />
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
        <EmptyEncounter message="Abra un paciente desde el censo para registrar la reubicación." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

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
          encounterId: activeEncounter.encounterId,
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
      <p className="lead">Registre la discrepancia de lecho de {activeEncounter.patientName} y avise a la central de camas.</p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="relocation-reason" label="Motivo de la discrepancia" value={reason} onChange={(event) => setReason(event.target.value)} error={errors.reason} />
        <TextField id="requested-room" label="Habitación solicitada" value={room} onChange={(event) => setRoom(event.target.value)} error={errors.room} />
        <TextField id="requested-bed" label="Lecho solicitado" value={bed} onChange={(event) => setBed(event.target.value)} error={errors.bed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {notice ? <Feedback tone="success">{notice}</Feedback> : null}
        <Button type="submit">Notificar reubicación</Button>
      </form>
      <p><Link to={`/piso/recepcion?ingreso=${encodeURIComponent(activeEncounter.encounterId)}`}>Volver a recepción</Link></p>
    </Sheet>
  );
}
