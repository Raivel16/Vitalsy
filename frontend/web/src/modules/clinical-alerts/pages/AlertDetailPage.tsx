import { createContext, type SyntheticEvent, useCallback, useContext, useEffect, useId, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useAuth } from "../../../app/AuthProvider";
import { Button } from "../../../shared/ui/Button";
import { BloodPressureField } from "../../../shared/ui/BloodPressureField";
import { CheckField, SelectField, TextAreaField, TextField, UnitField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { formatDateTime } from "../../../shared/datetime/format";
import { validateVitalSigns } from "../../nursing-assessment/domain/vitalSigns";
import type { Consciousness } from "../../nursing-assessment/domain/news2";
import {
  STATUS_LABEL,
  eventLabel,
  severityVisual,
  type AlertEscalation,
  type AlertEvent,
  type ClinicalAlert,
} from "../domain/alert";
import { notifyAlertAcknowledged } from "../domain/inboxEvents";
import { keyByContent } from "../../../shared/list/rowKeys";

const NURSING_ROLES: ReadonlySet<string> = new Set(["enfermera_piso", "enfermera_supervisora"]);
const MEDICAL_ROLES: ReadonlySet<string> = new Set(["medico_residente", "medico_tratante"]);

type NurseTab = "vitals" | "deterioro";

const emptyVitals = {
  respiratoryRate: "",
  oxygenSaturation: "",
  systolicBloodPressure: "",
  diastolicBloodPressure: "",
  pulse: "",
  temperature: "",
};

type PostAction = (action: string, body: unknown) => Promise<Record<string, unknown>>;
type Reload = () => Promise<void>;

type RunHandlers = {
  onSuccess: (result: Record<string, unknown>) => void;
  onError: (message: string) => void;
  failure: string;
};

type PageNotice = { text: string; link?: { to: string; label: string } };

/**
 * El aviso de éxito vive en la página y no en cada panel: tras una acción la alerta cambia de estado,
 * el panel puede desmontarse y su aviso se perdería.
 */
const AlertNoticeContext = createContext<(notice: PageNotice | null) => void>(() => {});

/** Devuelve `setNotice(texto)`; un texto vacío limpia el aviso. */
function useNotice(link?: PageNotice["link"]) {
  const announce = useContext(AlertNoticeContext);
  return (text: string) => announce(text ? { text, link } : null);
}

/** Ejecuta una acción del evento con bloqueo de doble envío; al terminar recarga la línea de tiempo. */
function useActionRunner(postAction: PostAction, reload: Reload) {
  const [saving, setSaving] = useState(false);

  async function run(action: string, body: unknown, handlers: RunHandlers) {
    setSaving(true);
    try {
      const result = await postAction(action, body);
      handlers.onSuccess(result);
      await reload();
    } catch (error_) {
      handlers.onError(errorText(error_, handlers.failure));
    } finally {
      setSaving(false);
    }
  }

  return { saving, run };
}

function useVitalsForm(postAction: PostAction, reload: Reload) {
  const { saving, run } = useActionRunner(postAction, reload);
  const [vitals, setVitals] = useState(emptyVitals);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const setNotice = useNotice();
  const errors = validateVitalSigns(vitals);
  const visibleErrors = submitted ? errors : {};

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    setNotice("");
    if (Object.keys(errors).length > 0) return;

    await run(
      "reassessment",
      {
        respiratoryRate: Number(vitals.respiratoryRate),
        oxygenSaturation: Number(vitals.oxygenSaturation),
        systolicBloodPressure: Number(vitals.systolicBloodPressure),
        diastolicBloodPressure: Number(vitals.diastolicBloodPressure),
        pulse: Number(vitals.pulse),
        temperature: Number(vitals.temperature.replace(",", ".")),
        consciousness,
      },
      {
        onSuccess: (result) => {
          setVitals(emptyVitals);
          setSubmitted(false);
          setNotice(
            (result as { medicalNotified?: boolean }).medicalNotified
              ? "NEWS2 sigue alterado: se notificó automáticamente al médico de guardia."
              : "Se recalculó el NEWS2. Si es 0, puede programar el próximo control.",
          );
        },
        onError: setError,
        failure: "No se pudo recalcular el NEWS2.",
      },
    );
  }

  return { vitals, setVitals, consciousness, setConsciousness, visibleErrors, error, saving, onSubmit };
}

function useScheduleForm(postAction: PostAction, reload: Reload) {
  const { saving, run } = useActionRunner(postAction, reload);
  const [frequency, setFrequency] = useState("60");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const setNotice = useNotice({ to: "/atencion/controles", label: "Abrir bandeja de controles" });

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const minutes = Number(frequency);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) {
      setError("Indique entre 15 y 1440 minutos.");
      return;
    }
    await run(
      "monitoring-schedule",
      { frequencyMinutes: minutes, note: note.trim() || undefined },
      {
        onSuccess: (result) => {
          const schedule = result.schedule as { nextDueAt?: string } | undefined;
          const when = schedule?.nextDueAt ? formatDateTime(schedule.nextDueAt) : null;
          setNotice(
            when
              ? `Se programó el próximo control para ${when}. Consúltelo en Controles.`
              : "Se programó el próximo control y se cerró la alerta.",
          );
        },
        onError: setError,
        failure: "No se pudo programar el control.",
      },
    );
  }

  return { frequency, setFrequency, note, setNote, error, saving, onSubmit };
}

function useMedicalRequestForm(postAction: PostAction, reload: Reload) {
  const { saving, run } = useActionRunner(postAction, reload);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const setNotice = useNotice({ to: "/alertas", label: "Ver bandeja de alertas" });

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (reason.trim().length < 5) {
      setError("Indique por qué el caso requiere atención médica.");
      return;
    }
    await run(
      "medical-request",
      { reason: reason.trim() },
      {
        onSuccess: () => {
          setNotice("Se notificó a los médicos de guardia (residente y tratante). Campana y sirena hasta confirmar lectura.");
          setReason("");
        },
        onError: setError,
        failure: "No se pudo solicitar atención médica.",
      },
    );
  }

  return { reason, setReason, error, saving, onSubmit };
}

type FormPanelProps = { postAction: PostAction; reload: Reload };

function VitalsTabPanel({
  tabsId,
  canSchedule,
  form,
  schedule,
}: Readonly<{
  tabsId: string;
  canSchedule: boolean;
  form: ReturnType<typeof useVitalsForm>;
  schedule: ReturnType<typeof useScheduleForm>;
}>) {
  const { vitals, setVitals, visibleErrors } = form;
  return (
    <div className="chart-tab-panel" role="tabpanel" id={`${tabsId}-panel-vitals`} aria-labelledby={`${tabsId}-vitals`} aria-label="Nueva toma de constantes">
      <Feedback tone="info">
        Registre la nueva toma. Si el NEWS2 sigue ≥ 1, el sistema notifica al médico automáticamente. Si queda en 0, programe el control.
      </Feedback>
      {form.error ? <Feedback tone="error">{form.error}</Feedback> : null}
      <form className="stack" onSubmit={form.onSubmit} noValidate>
        <div className="form-grid">
          <UnitField id="alert-rr" label="Frecuencia respiratoria" unit="rpm" abbr="FR" inputMode="numeric" value={vitals.respiratoryRate} onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })} error={visibleErrors.respiratoryRate} />
          <UnitField id="alert-spo2" label="Saturación" unit="%" abbr="SpO2" inputMode="numeric" value={vitals.oxygenSaturation} onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })} error={visibleErrors.oxygenSaturation} />
          <BloodPressureField
            systolicId="alert-sbp"
            diastolicId="alert-dbp"
            systolic={vitals.systolicBloodPressure}
            diastolic={vitals.diastolicBloodPressure}
            onSystolic={(value) => setVitals({ ...vitals, systolicBloodPressure: value })}
            onDiastolic={(value) => setVitals({ ...vitals, diastolicBloodPressure: value })}
            systolicError={visibleErrors.systolicBloodPressure}
            diastolicError={visibleErrors.diastolicBloodPressure}
          />
          <UnitField id="alert-pulse" label="Pulso" unit="lpm" abbr="FC" inputMode="numeric" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} error={visibleErrors.pulse} />
          <UnitField id="alert-temp" label="Temperatura" unit="°C" abbr="Temp" inputMode="decimal" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} error={visibleErrors.temperature} />
        </div>
        <SelectField id="alert-consciousness" label="Conciencia" value={form.consciousness} onChange={(e) => form.setConsciousness(e.target.value as Consciousness)}>
          <option value="alert">Alerta</option>
          <option value="confusion">Confusión</option>
          <option value="voice">Responde a la voz</option>
          <option value="pain">Responde al dolor</option>
          <option value="unresponsive">No responde</option>
        </SelectField>
        <FormActions>
          <Button type="submit" disabled={form.saving}>
            {form.saving ? "Recalculando…" : "Recalcular NEWS2"}
          </Button>
        </FormActions>
      </form>

      <section className="result-block" aria-label="Programación del control">
        <h3>Programar control (solo si NEWS2 = 0)</h3>
        {schedule.error ? <Feedback tone="error">{schedule.error}</Feedback> : null}
        <form className="stack" onSubmit={schedule.onSubmit} noValidate>
          <TextField
            id="alert-frequency"
            label="¿Cada cuántos minutos se repetirá el control?"
            inputMode="numeric"
            value={schedule.frequency}
            onChange={(e) => schedule.setFrequency(e.target.value.replace(/\D/g, ""))}
            hint="Entre 15 minutos y 24 horas."
          />
          <TextAreaField id="alert-schedule-note" label="Observación del control (opcional)" rows={2} value={schedule.note} onChange={(e) => schedule.setNote(e.target.value)} />
          <FormActions>
            <Button type="submit" variant="quiet" disabled={schedule.saving || !canSchedule}>
              {schedule.saving ? "Programando…" : "Programar control"}
            </Button>
          </FormActions>
        </form>
      </section>
    </div>
  );
}

function DeteriorationTabPanel({ tabsId, medical }: Readonly<{ tabsId: string; medical: ReturnType<typeof useMedicalRequestForm> }>) {
  return (
    <div className="chart-tab-panel" role="tabpanel" id={`${tabsId}-panel-deterioro`} aria-labelledby={`${tabsId}-deterioro`} aria-label="Deterioro clínico">
      <Feedback tone="info">
        Use esta pestaña si nota deterioro o preocupación clínica (nurse&apos;s worry) aunque aún no haya segunda toma. El médico recibe la alerta de inmediato.
      </Feedback>
      {medical.error ? <Feedback tone="error">{medical.error}</Feedback> : null}
      <form className="stack" onSubmit={medical.onSubmit} noValidate>
        <TextAreaField
          id="alert-medical-reason"
          label="Motivo de la atención médica"
          rows={3}
          value={medical.reason}
          onChange={(e) => medical.setReason(e.target.value)}
        />
        <FormActions>
          <Button type="submit" disabled={medical.saving}>
            {medical.saving ? "Notificando…" : "Solicitar atención médica"}
          </Button>
        </FormActions>
      </form>
    </div>
  );
}

const NURSE_TABS: { id: NurseTab; label: string }[] = [
  { id: "vitals", label: "Nueva toma / NEWS2" },
  { id: "deterioro", label: "Deterioro / preocupación clínica" },
];

function NurseCarePanel({ canSchedule, postAction, reload }: Readonly<FormPanelProps & { canSchedule: boolean }>) {
  const tabsId = useId();
  const [tab, setTab] = useState<NurseTab>("vitals");
  const form = useVitalsForm(postAction, reload);
  const schedule = useScheduleForm(postAction, reload);
  const medical = useMedicalRequestForm(postAction, reload);

  return (
    <>
      <div className="chart-tabs" role="tablist" aria-label="Acciones de enfermería">
        {NURSE_TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabsId}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${item.id}`}
              className={selected ? "chart-tab is-active" : "chart-tab"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "vitals" ? (
        <VitalsTabPanel tabsId={tabsId} canSchedule={canSchedule} form={form} schedule={schedule} />
      ) : (
        <DeteriorationTabPanel tabsId={tabsId} medical={medical} />
      )}
    </>
  );
}

function AcknowledgePanel({
  alertId,
  postAction,
  reload,
}: Readonly<FormPanelProps & { alertId: string | undefined }>) {
  const { saving, run } = useActionRunner(postAction, reload);
  const [error, setError] = useState("");
  const setNotice = useNotice();

  async function onAcknowledge() {
    setError("");
    setNotice("");
    await run("acknowledge", null, {
      onSuccess: () => {
        if (alertId) notifyAlertAcknowledged(Number(alertId));
        setNotice("Confirmó la lectura. Continúe con la atención del paciente.");
      },
      onError: setError,
      failure: "No se pudo confirmar la recepción.",
    });
  }

  return (
    <section className="result-block" aria-label="Confirmación de lectura">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <FormActions>
        <Button type="button" disabled={saving} onClick={() => void onAcknowledge()}>
          {saving ? "Confirmando…" : "Confirmar recepción"}
        </Button>
        <Link to="/alertas">Volver a la bandeja</Link>
      </FormActions>
    </section>
  );
}

function DoctorPanel({ pendingAck, postAction, reload }: Readonly<FormPanelProps & { pendingAck: boolean }>) {
  const assessmentRun = useActionRunner(postAction, reload);
  const rrtRun = useActionRunner(postAction, reload);
  const [assessment, setAssessment] = useState("");
  const [orders, setOrders] = useState("");
  const [medicalError, setMedicalError] = useState("");
  const setActionNotice = useNotice();
  const [rrtReason, setRrtReason] = useState("");
  const [rrtError, setRrtError] = useState("");

  async function onMedicalAssessment(event: SyntheticEvent) {
    event.preventDefault();
    setMedicalError("");
    setActionNotice("");
    if (assessment.trim().length < 5 || orders.trim().length < 5) {
      setMedicalError("Registre la evaluación y las indicaciones de urgencia.");
      return;
    }
    await assessmentRun.run(
      "medical-assessment",
      { assessment: assessment.trim(), orders: orders.trim() },
      {
        onSuccess: () => {
          setActionNotice("Se registró la atención médica y se cerró el evento. Continuidad en sala.");
          setAssessment("");
          setOrders("");
        },
        onError: setMedicalError,
        failure: "No se pudo registrar la atención médica.",
      },
    );
  }

  async function onRequestRrt(event: SyntheticEvent) {
    event.preventDefault();
    setRrtError("");
    if (rrtReason.trim().length < 5) {
      setRrtError("Indique por qué se requiere el equipo de respuesta rápida.");
      return;
    }
    await rrtRun.run(
      "rapid-response-request",
      { reason: rrtReason.trim() },
      {
        onSuccess: () => {
          setActionNotice("Se solicitó la intervención del equipo de respuesta rápida.");
          setRrtReason("");
        },
        onError: setRrtError,
        failure: "No se pudo solicitar el ERR.",
      },
    );
  }

  return (
    <section className="result-block" aria-label="Atención médica de urgencia">
      {medicalError ? <Feedback tone="error">{medicalError}</Feedback> : null}
      {rrtError ? <Feedback tone="error">{rrtError}</Feedback> : null}
      <h3>Evaluación e indicaciones de urgencia</h3>
      <form className="stack" onSubmit={onMedicalAssessment} noValidate>
        <TextAreaField id="alert-assessment" label="Evaluación del paciente" rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} />
        <TextAreaField id="alert-orders" label="Indicaciones médicas de urgencia" rows={3} value={orders} onChange={(e) => setOrders(e.target.value)} />
        <FormActions>
          <Button type="submit" disabled={assessmentRun.saving || pendingAck}>
            {assessmentRun.saving ? "Registrando…" : "Registrar atención médica"}
          </Button>
        </FormActions>
      </form>
      <form className="stack" onSubmit={onRequestRrt} noValidate>
        <h3>El paciente no se estabiliza</h3>
        <TextAreaField id="alert-rrt-reason" label="Motivo de la intervención especializada" rows={3} value={rrtReason} onChange={(e) => setRrtReason(e.target.value)} />
        <FormActions>
          <Button type="submit" variant="quiet" disabled={rrtRun.saving || pendingAck}>
            {rrtRun.saving ? "Solicitando…" : "Solicitar equipo de respuesta rápida"}
          </Button>
        </FormActions>
      </form>
    </section>
  );
}

function RrtPanel({ pendingAck, postAction, reload }: Readonly<FormPanelProps & { pendingAck: boolean }>) {
  const { saving, run } = useActionRunner(postAction, reload);
  const [assessment, setAssessment] = useState("");
  const [transferToIcu, setTransferToIcu] = useState(false);
  const [error, setError] = useState("");
  const setNotice = useNotice();

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (assessment.trim().length < 5) {
      setError("Registre la evaluación del equipo de respuesta rápida.");
      return;
    }
    await run(
      "err-assessment",
      { assessment: assessment.trim(), transferToIcu },
      {
        onSuccess: () => {
          setNotice(
            transferToIcu
              ? "Se emitió la orden de UCI. Médico y enfermera deben autorizarla."
              : "Paciente estabilizado; la alerta se cerró en sala general.",
          );
        },
        onError: setError,
        failure: "No se pudo registrar la evaluación del ERR.",
      },
    );
  }

  return (
    <section className="result-block" aria-label="Evaluación del equipo de respuesta rápida">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextAreaField id="alert-err-assessment" label="Evaluación del paciente" rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} />
        <CheckField id="alert-icu" label="Requiere traslado a cuidados intensivos" checked={transferToIcu} onChange={(e) => setTransferToIcu(e.target.checked)} />
        <FormActions>
          <Button type="submit" disabled={saving || pendingAck}>
            {saving ? "Registrando…" : "Registrar evaluación del equipo"}
          </Button>
        </FormActions>
      </form>
    </section>
  );
}

function IcuSummary({ icu }: Readonly<{ icu: NonNullable<ClinicalAlert["icuTransfer"]> }>) {
  return (
    <ul className="hint">
      <li>Orden: {icu.orderedAt ? formatDateTime(icu.orderedAt) : "—"}</li>
      <li>Autorización médica: {icu.doctorAuthorized ? formatDateTime(icu.doctorAuthorizedAt) : "Pendiente"}</li>
      <li>Autorización enfermería: {icu.nurseAuthorized ? formatDateTime(icu.nurseAuthorizedAt) : "Pendiente"}</li>
      <li>Traslado efectivo: {icu.transferredAt ? formatDateTime(icu.transferredAt) : "Pendiente"}</li>
      <li>Retorno a sala: {icu.returnedAt ? formatDateTime(icu.returnedAt) : "—"}</li>
    </ul>
  );
}

function IcuTransferForm({
  runner,
  setError,
  setNotice,
}: Readonly<{
  runner: ReturnType<typeof useActionRunner>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
}>) {
  const [room, setRoom] = useState("UCI-1");
  const [bed, setBed] = useState("A");

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    await runner.run(
      "icu-transfer",
      { service: "UCI", room: room.trim(), bed: bed.trim() || undefined },
      {
        onSuccess: () => setNotice("Traslado efectivo a UCI registrado. La ubicación del ingreso se actualizó."),
        onError: setError,
        failure: "No se pudo registrar el traslado a UCI.",
      },
    );
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        <TextField id="icu-room" label="Unidad / habitación UCI" value={room} onChange={(e) => setRoom(e.target.value)} />
        <TextField id="icu-bed" label="Lecho" value={bed} onChange={(e) => setBed(e.target.value)} />
      </div>
      <FormActions>
        <Button type="submit" disabled={runner.saving}>
          {runner.saving ? "Registrando…" : "Registrar traslado efectivo"}
        </Button>
      </FormActions>
    </form>
  );
}

function IcuReturnForm({
  runner,
  setError,
  setNotice,
}: Readonly<{
  runner: ReturnType<typeof useActionRunner>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
}>) {
  const [room, setRoom] = useState("507");
  const [bed, setBed] = useState("B");
  const [service, setService] = useState("Medicina");
  const [note, setNote] = useState("");

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    await runner.run(
      "icu-return",
      {
        service: service.trim(),
        room: room.trim(),
        bed: bed.trim() || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => setNotice("Retorno a sala registrado. La alerta quedó cerrada con trazabilidad completa."),
        onError: setError,
        failure: "No se pudo registrar el retorno a sala.",
      },
    );
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <h3>Retorno a sala general</h3>
      <div className="form-grid">
        <TextField id="return-service" label="Servicio" value={service} onChange={(e) => setService(e.target.value)} />
        <TextField id="return-room" label="Habitación" value={room} onChange={(e) => setRoom(e.target.value)} />
        <TextField id="return-bed" label="Lecho" value={bed} onChange={(e) => setBed(e.target.value)} />
      </div>
      <TextAreaField id="return-note" label="Observación (opcional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      <FormActions>
        <Button type="submit" disabled={runner.saving}>
          {runner.saving ? "Registrando…" : "Registrar retorno a sala"}
        </Button>
      </FormActions>
    </form>
  );
}

function IcuPanel({
  icu,
  canAuthorize,
  canTransfer,
  canReturn,
  postAction,
  reload,
}: Readonly<FormPanelProps & {
  icu: NonNullable<ClinicalAlert["icuTransfer"]>;
  canAuthorize: boolean;
  canTransfer: boolean;
  canReturn: boolean;
}>) {
  const authorize = useActionRunner(postAction, reload);
  const transfer = useActionRunner(postAction, reload);
  const back = useActionRunner(postAction, reload);
  const [error, setError] = useState("");
  const setNotice = useNotice();

  async function onAuthorize() {
    setError("");
    setNotice("");
    await authorize.run("icu-authorize", null, {
      onSuccess: () => setNotice("Autorización de traslado a UCI registrada."),
      onError: setError,
      failure: "No se pudo autorizar el traslado.",
    });
  }

  return (
    <section className="result-block" aria-label="Ciclo de traslado a UCI">
      <h3>Traslado a UCI</h3>
      <IcuSummary icu={icu} />
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {canAuthorize ? (
        <FormActions>
          <Button type="button" disabled={authorize.saving} onClick={() => void onAuthorize()}>
            {authorize.saving ? "Autorizando…" : "Autorizar traslado a UCI"}
          </Button>
        </FormActions>
      ) : null}
      {canTransfer ? (
        <IcuTransferForm runner={transfer} setError={setError} setNotice={setNotice} />
      ) : null}
      {canReturn ? <IcuReturnForm runner={back} setError={setError} setNotice={setNotice} /> : null}
    </section>
  );
}

function EventHistory({ events, escalations }: Readonly<{ events: AlertEvent[]; escalations: AlertEscalation[] }>) {
  return (
    <section className="result-block" aria-label="Historial del evento">
      <h3>Historial del evento</h3>
      {events.length === 0 ? (
        <Feedback tone="info">Aún no hay movimientos registrados.</Feedback>
      ) : (
        <ol className="timeline">
          {events.map((item) => (
            <li key={item.id}>
              <p><strong>{eventLabel(item.type)}</strong> · {formatDateTime(item.occurredAt)}</p>
              {item.detail ? <p>{item.detail}</p> : null}
              {item.userName ? <p className="hint">{item.userName}{item.role ? ` · ${item.role}` : ""}</p> : null}
            </li>
          ))}
        </ol>
      )}
      {escalations.length > 0 ? (
        <ul className="hint">
          {keyByContent(escalations, (item) => `${item.toRole}|${item.escalatedAt}|${item.reason}`).map(({ key, item }) => (
            <li key={key}>Escalada a {item.toRole} · {formatDateTime(item.escalatedAt)} · {item.reason}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

const ICU_FLOW_STATUSES = new Set(["orden_uci", "uci_autorizada", "en_uci"]);

function alertPermissions(alert: ClinicalAlert, role: string) {
  const closed = alert.status === "cerrada";
  const inIcuFlow = ICU_FLOW_STATUSES.has(alert.status);
  const isDoctor = MEDICAL_ROLES.has(role);
  const icu = alert.icuTransfer;
  const canNurseCare = NURSING_ROLES.has(role) && !closed && alert.status === "en_atencion";
  return {
    closed,
    pendingAck: alert.needsSiren && !inIcuFlow,
    canNurseCare,
    canSchedule: canNurseCare && Boolean(alert.reassessedAt) && (alert.news2Total ?? 1) < 1,
    isDoctor,
    isRrt: role === "equipo_respuesta_rapida",
    inIcuFlow,
    canAuthorizeIcu: !closed
      && alert.status === "orden_uci"
      && ((isDoctor && !icu?.doctorAuthorized) || (role === "enfermera_piso" && !icu?.nurseAuthorized)),
    canTransferIcu: !closed
      && alert.status === "uci_autorizada"
      && ["enfermera_piso", "enfermera_supervisora", "camillero"].includes(role),
    canReturnIcu: !closed && alert.status === "en_uci" && NURSING_ROLES.has(role),
  };
}

function useAlertTimeline(alertId: string | undefined) {
  const [alert, setAlert] = useState<ClinicalAlert | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [escalations, setEscalations] = useState<AlertEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const load = useCallback(async () => {
    if (!alertId) return;
    try {
      const data = await api<{ alert: ClinicalAlert; events: AlertEvent[]; escalations: AlertEscalation[] }>(
        `/api/v1/clinical-alerts/${encodeURIComponent(alertId)}/timeline`,
      );
      setAlert(data.alert);
      setEvents(data.events);
      setEscalations(data.escalations);
      setPageError("");
    } catch (error_) {
      setPageError(errorText(error_, "No se pudo cargar el evento."));
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { alert, events, escalations, loading, pageError, load };
}

function followUpText(alert: ClinicalAlert): string {
  if (alert.followUpDueAt && alert.status === "en_atencion") {
    return ` · Completar antes de ${formatDateTime(alert.followUpDueAt)}`;
  }
  return "";
}

/** Con `key` por alerta, el aviso de éxito se reinicia al abrir otro evento. */
export function AlertDetailPage() {
  const { alertId } = useParams();
  return <AlertDetailView key={alertId} />;
}

function AlertDetailView() {
  const { alertId } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const { alert, events, escalations, loading, pageError, load } = useAlertTimeline(alertId);
  const [notice, setNotice] = useState<PageNotice | null>(null);

  const postAction: PostAction = async (action, body) =>
    api(`/api/v1/clinical-alerts/${encodeURIComponent(String(alertId))}/${action}`, {
      method: "POST",
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  if (loading) return <LoadingState label="Cargando el evento…" />;
  if (!alert) return <Feedback tone="error">{pageError || "No se encontró el evento."}</Feedback>;

  const perms = alertPermissions(alert, role);
  const { closed, pendingAck } = perms;
  const icu = alert.icuTransfer;

  return (
    <AlertNoticeContext.Provider value={setNotice}>
    <Sheet kicker="Gestión de alertas" title="Evento de alerta" wide clinic="file" className="floor-care">
      <p className="lead">
        {alert.patientName ?? alert.encounterId} · {alert.location ?? "Ubicación no registrada"}
      </p>
      <output className={`news news-${severityVisual(alert.severity)}`} aria-label="Estado de la alerta">
        {alert.news2Total === null ? "" : `NEWS2 ${alert.news2Total} · `}
        {STATUS_LABEL[alert.status]}
        {followUpText(alert)}
      </output>
      {pageError ? <Feedback tone="error">{pageError}</Feedback> : null}
      {notice ? (
        <Feedback tone="success">
          {notice.text}
          {notice.link ? <>{" "}<Link to={notice.link.to}>{notice.link.label}</Link></> : null}
        </Feedback>
      ) : null}
      <p className="hint">
        <Link to={`/atencion/chart?ingreso=${encodeURIComponent(alert.encounterId)}`}>Ver en el expediente clínico</Link>
      </p>

      <div className="split-board">
        <div className="stack">
          {pendingAck && !closed ? <AcknowledgePanel alertId={alertId} postAction={postAction} reload={load} /> : null}

          {perms.canNurseCare ? (
            <NurseCarePanel canSchedule={perms.canSchedule} postAction={postAction} reload={load} />
          ) : null}

          {perms.isDoctor && !closed && !perms.inIcuFlow ? (
            <DoctorPanel pendingAck={pendingAck} postAction={postAction} reload={load} />
          ) : null}

          {perms.isRrt && !closed && (alert.status === "err_solicitado" || alert.status === "escalada_err") ? (
            <RrtPanel pendingAck={pendingAck} postAction={postAction} reload={load} />
          ) : null}

          {!closed && icu?.ordered ? (
            <IcuPanel
              icu={icu}
              canAuthorize={perms.canAuthorizeIcu}
              canTransfer={perms.canTransferIcu}
              canReturn={perms.canReturnIcu}
              postAction={postAction}
              reload={load}
            />
          ) : null}
        </div>
        <EventHistory events={events} escalations={escalations} />
      </div>
    </Sheet>
    </AlertNoticeContext.Provider>
  );
}
