import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  IconAlertTriangle,
  IconArrowsExchange,
  IconBed,
  IconCheck,
  IconHospital,
  IconQrcode,
  IconScan,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { StatusPill } from "../../../shared/ui/clinical";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import type { Encounter } from "../../admission-census/domain/encounter";

function destinationLine(room?: string | null, bed?: string | null, service?: string | null) {
  return [
    service,
    room ? `Habitación ${room}` : null,
    bed ? `Lecho ${bed}` : null,
  ].filter(Boolean).join(" · ") || "Sin ubicación asignada";
}

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

  const transfer = result?.transfer;
  const room = transfer?.room ?? activeEncounter.location.room;
  const bed = transfer?.bed ?? activeEncounter.location.bed;
  const service = transfer?.service ?? activeEncounter.location.service;

  return (
    <Sheet kicker="Celador / Camillero · Traslado interno" title="Orden de traslado a piso">
      <p className="lead">
        Valide el destino asignado y confirme el inicio del traslado de {activeEncounter.patientName} desde {activeEncounter.originService} hacia la cama de hospitalización.
      </p>
      <form className="stack transfer-lookup" onSubmit={onSubmit}>
        <TextField id="transfer-order" label="Número de traslado" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
        <div className="transfer-lookup-actions">
          <Button type="submit">
            <IconSearch size={18} /> Consultar traslado
          </Button>
        </div>
      </form>
      {loading ? <p role="status">Cargando orden de traslado.</p> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {result ? (
        <section className="transfer-panel" aria-label="Orden de traslado">
          <div className="transfer-facts">
            <div>
              <span className="kicker">Código de traslado</span>
              <strong className="tabular-nums">{result.transfer.orderNumber}</strong>
            </div>
            <div>
              <span className="kicker">Servicio de destino</span>
              <strong className="transfer-inline">
                <IconHospital size={18} /> {result.transfer.service}
              </strong>
            </div>
          </div>
          <div className="transfer-dest">
            <div className="transfer-dest-main">
              <span className="transfer-dest-icon" aria-hidden>
                <IconBed size={20} />
              </span>
              <div>
                <span className="kicker">Ubicación asignada en destino</span>
                <strong>{destinationLine(result.transfer.room, result.transfer.bed)}</strong>
              </div>
            </div>
            <span className="transfer-dest-chip">Cama asignada</span>
          </div>
          <div className="transfer-facts">
            <div>
              <span className="kicker">Paciente e identificación</span>
              <strong>{result.transfer.patientName}</strong>
              <p>{activeEncounter.documentType} {activeEncounter.documentNumber}</p>
            </div>
            <div>
              <span className="kicker">Servicio de origen</span>
              <strong>{activeEncounter.originService}</strong>
            </div>
          </div>
          <div className="protocol-box">
            <IconShieldCheck size={20} />
            <div>
              <strong>Indicación obligatoria de camillero</strong>
              <p>Verificar brazalete físico antes de retirar de emergencia. Compruebe código de barras y nombre completo contra esta orden.</p>
            </div>
          </div>
          <div className="transfer-route">
            <div className="transfer-route-head">
              <span className="kicker">Ruta interna</span>
              <span className="transfer-inline">
                <IconArrowsExchange size={16} /> {activeEncounter.originService} → {destinationLine(room, bed, service)}
              </span>
            </div>
            <div className="transfer-route-line" aria-hidden>
              <span>{activeEncounter.originService}</span>
              <span className="transfer-route-track" />
              <span>Habitación {result.transfer.room} · Lecho {result.transfer.bed}</span>
            </div>
          </div>
          <Button type="button" onClick={() => void confirmTransfer()} disabled={pending || advanced}>
            <IconCheck size={18} /> Confirmar traslado
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
    <Sheet kicker="Celador / Camillero · Seguridad del paciente" title="Verificación de identidad">
      <p className="lead">
        Escanee el código de barras o QR del brazalete físico de {activeEncounter.patientName} a pie de camilla antes de autorizar el desplazamiento.
      </p>
      <div className="scan-panel identity-verify">
        <div className="scan-panel-icon" aria-hidden>
          <IconQrcode size={32} />
        </div>
        <h3>Lector óptico listo</h3>
        <p>Aproxime el brazalete al lector o ingrese el código alfanumérico manualmente.</p>
        <BarcodeScanner onScan={onScan} />
        <form className="scan-panel-form" onSubmit={onSubmit}>
          <TextField id="wristband-code" label="Código del brazalete" value={code} onChange={(event) => setCode(event.target.value)} />
          <Button type="submit" pending={pending} disabled={pending || advanced}>
            <IconScan size={18} /> Verificar brazalete
          </Button>
        </form>
      </div>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {message ? <Feedback tone="success">{message}</Feedback> : null}
      <div className="protocol-box protocol-warn">
        <IconAlertTriangle size={20} />
        <div>
          <strong>Protocolo de seguridad del paciente</strong>
          <p>Si el brazalete no corresponde a este paciente, el sistema bloqueará el pase e informará a Admisión y a Supervisión de enfermería.</p>
        </div>
      </div>
      <div className="transfer-snapshot">
        <div>
          <span className="kicker">Origen</span>
          <strong>{activeEncounter.originService}</strong>
        </div>
        <div>
          <span className="kicker">Destino</span>
          <strong>{destinationLine(activeEncounter.location.room, activeEncounter.location.bed, activeEncounter.location.service)}</strong>
        </div>
      </div>
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
      <Sheet kicker="Enfermería de piso · Admisión en planta" title="Recepción física en piso" wide framed clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para confirmar su recepción." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;
  const room = activeEncounter.location.room;
  const bed = activeEncounter.location.bed;
  const service = activeEncounter.location.service;
  const assignedBed = [room ? `Habitación ${room}` : null, bed ? `lecho ${bed}` : null].filter(Boolean).join("-")
    || "el lecho asignado";

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
    <Sheet kicker="Enfermería de piso · Admisión en planta" title="Recepción física en piso" wide framed clinic="form">
      <p className="lead">
        Formalice el arribo de {activeEncounter.patientName} al servicio hospitalario y confirme la ocupación del lecho asignado.
      </p>
      <section className="nursing-block" aria-label="Ubicación y parámetros de internación">
        <header className="nursing-block-head">
          <h3>Ubicación y parámetros de internación</h3>
        </header>
        <dl className="nursing-tiles">
          <div>
            <dt><IconBed size={18} aria-hidden /> Habitación asignada</dt>
            <dd>{room ?? "Sin habitación"}</dd>
          </div>
          <div>
            <dt><IconHospital size={18} aria-hidden /> Lecho asignado</dt>
            <dd>{bed ?? "Sin lecho"}</dd>
          </div>
          <div>
            <dt><IconHospital size={18} aria-hidden /> Servicio clínico</dt>
            <dd>{service ?? "Sin servicio"}</dd>
          </div>
          <div>
            <dt><IconQrcode size={18} aria-hidden /> Brazalete de identificación</dt>
            <dd>{activeEncounter.wristbandCode ?? "Aún no emitido"}</dd>
          </div>
        </dl>
      </section>
      <div className="nursing-banner nursing-banner-warn">
        <span>
          <IconAlertTriangle size={18} aria-hidden />
          Si el lecho asignado no está disponible o no coincide, registre la discrepancia.
        </span>
        <Link to={`/piso/reubicacion?ingreso=${encodeURIComponent(activeEncounter.encounterId)}`}>
          Registrar reubicación
        </Link>
      </div>
      <ul className="nursing-protocol">
        <li>
          <IconCheck size={18} aria-hidden />
          <div>
            <strong>Confirme la llegada física del paciente y la asignación efectiva a {assignedBed}.</strong>
            <p>El paciente debe quedar posicionado, confortable y con el timbre al alcance.</p>
          </div>
        </li>
        <li>
          <IconCheck size={18} aria-hidden />
          <div>
            <strong>Entrega de expediente físico y pertenencias personales recibida.</strong>
            <p>Hoja de transferencia, consentimientos firmados y valores del paciente.</p>
          </div>
        </li>
      </ul>
      <form className="form-actions-bar" onSubmit={onSubmit}>
        <Link
          className="button button-quiet"
          to={`/piso/reubicacion?ingreso=${encodeURIComponent(activeEncounter.encounterId)}`}
        >
          Registrar reubicación
        </Link>
        <Button type="submit" pending={pending} disabled={pending || advanced}>
          <IconCheck size={18} /> Confirmar recepción
        </Button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {status ? (
        <Feedback tone="success">
          Paciente {status} en el lecho asignado.
        </Feedback>
      ) : null}
      <StepNav role={role} encounter={activeEncounter} viewingStep="recepcion" canContinue={advanced} />
    </Sheet>
  );
}

export function RelocationPage() {
  const encounter = useEncounter();
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [room, setRoom] = useState("");
  const [bed, setBed] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!encounter) {
    return (
      <Sheet kicker="Gestión de lechos · Contingencia hospitalaria" title="Reubicación del paciente" wide framed clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar la reubicación." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;
  const assigned = [
    activeEncounter.location.room ? `Habitación ${activeEncounter.location.room}` : null,
    activeEncounter.location.bed ? `Lecho ${activeEncounter.location.bed}` : null,
    activeEncounter.location.service,
  ].filter(Boolean).join(" · ") || "Sin ubicación asignada";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!reason.trim()) next.reason = "El motivo de la discrepancia es obligatorio.";
    if (!room.trim()) next.room = "La habitación solicitada es obligatoria.";
    if (!bed.trim()) next.bed = "El lecho solicitado es obligatorio.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
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
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Gestión de lechos · Contingencia hospitalaria" title="Reubicación del paciente" wide framed clinic="form">
      <p className="lead">
        Registre el cambio en la asignación física de lecho o la discrepancia encontrada al momento del ingreso a piso de {activeEncounter.patientName}.
      </p>
      <div className="nursing-banner nursing-banner-warn">
        <span>
          <IconAlertTriangle size={18} aria-hidden />
          Acción con impacto en el censo centralizado. Toda reubicación de cama actualiza el censo hospitalario y notifica a la central de admisiones y supervisión de enfermería.
        </span>
      </div>
      <section className="nursing-block" aria-label="Ubicación asignada originalmente">
        <header className="nursing-block-head">
          <h3>Ubicación asignada originalmente</h3>
          <span>Solo lectura · Admisión</span>
        </header>
        <div className="reloc-assigned">
          <strong><IconBed size={18} aria-hidden /> {assigned}</strong>
          <StatusPill tone="warning">No disponible</StatusPill>
        </div>
      </section>
      <form className="stack nursing-form" onSubmit={onSubmit} noValidate>
        <TextAreaField
          id="relocation-reason"
          label="Motivo de la discrepancia"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={errors.reason}
          rows={4}
          labelAside={`${reason.length}/300`}
        />
        <div className="form-grid">
          <TextField id="requested-room" label="Habitación solicitada" value={room} onChange={(event) => setRoom(event.target.value)} error={errors.room} />
          <TextField id="requested-bed" label="Lecho solicitado" value={bed} onChange={(event) => setBed(event.target.value)} error={errors.bed} />
        </div>
        <p className="hint">Registrado por {user?.name ?? "Enfermería de piso"}.</p>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {notice ? <Feedback tone="success">{notice}</Feedback> : null}
        <div className="form-actions-bar">
          <Link className="button button-quiet" to={`/piso/recepcion?ingreso=${encodeURIComponent(activeEncounter.encounterId)}`}>
            Volver a recepción
          </Link>
          <Button type="submit" pending={pending}>Notificar reubicación</Button>
        </div>
      </form>
    </Sheet>
  );
}
