import { type SyntheticEvent, useCallback, useEffect, useId, useState } from "react";
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

export function AlertDetailPage() {
  const { alertId } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";
  const tabsId = useId();

  const [alert, setAlert] = useState<ClinicalAlert | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [escalations, setEscalations] = useState<AlertEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState("");
  const [tab, setTab] = useState<NurseTab>("vitals");

  const [vitals, setVitals] = useState(emptyVitals);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [vitalsSubmitted, setVitalsSubmitted] = useState(false);
  const [vitalsError, setVitalsError] = useState("");
  const [vitalsNotice, setVitalsNotice] = useState("");
  const [frequency, setFrequency] = useState("60");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleNotice, setScheduleNotice] = useState("");
  const [medicalReason, setMedicalReason] = useState("");
  const [medicalReasonError, setMedicalReasonError] = useState("");
  const [medicalNotice, setMedicalNotice] = useState("");
  const [assessment, setAssessment] = useState("");
  const [orders, setOrders] = useState("");
  const [medicalError, setMedicalError] = useState("");
  const [medicalActionNotice, setMedicalActionNotice] = useState("");
  const [errReason, setErrReason] = useState("");
  const [errReasonError, setErrReasonError] = useState("");
  const [errAssessment, setErrAssessment] = useState("");
  const [errAssessmentError, setErrAssessmentError] = useState("");
  const [errNotice, setErrNotice] = useState("");
  const [transferToIcu, setTransferToIcu] = useState(false);
  const [icuError, setIcuError] = useState("");
  const [icuNotice, setIcuNotice] = useState("");
  const [icuRoom, setIcuRoom] = useState("UCI-1");
  const [icuBed, setIcuBed] = useState("A");
  const [returnRoom, setReturnRoom] = useState("507");
  const [returnBed, setReturnBed] = useState("B");
  const [returnService, setReturnService] = useState("Medicina");
  const [returnNote, setReturnNote] = useState("");
  const [ackError, setAckError] = useState("");
  const [ackNotice, setAckNotice] = useState("");

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

  async function postAction(action: string, body: unknown): Promise<Record<string, unknown>> {
    return api(`/api/v1/clinical-alerts/${encodeURIComponent(String(alertId))}/${action}`, {
      method: "POST",
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  const vitalsErrors = validateVitalSigns(vitals);
  const visibleVitalsErrors = vitalsSubmitted ? vitalsErrors : {};

  async function onAcknowledge() {
    setSaving("acknowledge");
    setAckError("");
    setAckNotice("");
    try {
      await postAction("acknowledge", null);
      if (alertId) notifyAlertAcknowledged(Number(alertId));
      setAckNotice("Confirmó la lectura. Continúe con la atención del paciente.");
      await load();
    } catch (error_) {
      setAckError(errorText(error_, "No se pudo confirmar la recepción."));
    } finally {
      setSaving("");
    }
  }

  async function onReassess(event: SyntheticEvent) {
    event.preventDefault();
    setVitalsSubmitted(true);
    setVitalsError("");
    setVitalsNotice("");
    if (Object.keys(vitalsErrors).length > 0) return;

    setSaving("reassessment");
    try {
      const data = await postAction("reassessment", {
        respiratoryRate: Number(vitals.respiratoryRate),
        oxygenSaturation: Number(vitals.oxygenSaturation),
        systolicBloodPressure: Number(vitals.systolicBloodPressure),
        diastolicBloodPressure: Number(vitals.diastolicBloodPressure),
        pulse: Number(vitals.pulse),
        temperature: Number(vitals.temperature.replace(",", ".")),
        consciousness,
      }) as { medicalNotified?: boolean };
      setVitals(emptyVitals);
      setVitalsSubmitted(false);
      setVitalsNotice(
        data.medicalNotified
          ? "NEWS2 sigue alterado: se notificó automáticamente al médico de guardia."
          : "Se recalculó el NEWS2. Si es 0, puede programar el próximo control.",
      );
      await load();
    } catch (error_) {
      setVitalsError(errorText(error_, "No se pudo recalcular el NEWS2."));
    } finally {
      setSaving("");
    }
  }

  async function onSchedule(event: SyntheticEvent) {
    event.preventDefault();
    setScheduleError("");
    setScheduleNotice("");
    const minutes = Number(frequency);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) {
      setScheduleError("Indique entre 15 y 1440 minutos.");
      return;
    }
    setSaving("schedule");
    try {
      const result = await postAction("monitoring-schedule", {
        frequencyMinutes: minutes,
        note: scheduleNote.trim() || undefined,
      });
      const schedule = result.schedule as { nextDueAt?: string } | undefined;
      const when = schedule?.nextDueAt ? formatDateTime(schedule.nextDueAt) : null;
      setScheduleNotice(
        when
          ? `Se programó el próximo control para ${when}. Consúltelo en Controles.`
          : "Se programó el próximo control y se cerró la alerta.",
      );
      await load();
    } catch (error_) {
      setScheduleError(errorText(error_, "No se pudo programar el control."));
    } finally {
      setSaving("");
    }
  }

  async function onRequestMedical(event: SyntheticEvent) {
    event.preventDefault();
    setMedicalReasonError("");
    setMedicalNotice("");
    if (medicalReason.trim().length < 5) {
      setMedicalReasonError("Indique por qué el caso requiere atención médica.");
      return;
    }
    setSaving("medical-request");
    try {
      await postAction("medical-request", { reason: medicalReason.trim() });
      setMedicalNotice(
        "Se notificó a los médicos de guardia (residente y tratante). Campana y sirena hasta confirmar lectura.",
      );
      setMedicalReason("");
      await load();
    } catch (error_) {
      setMedicalReasonError(errorText(error_, "No se pudo solicitar atención médica."));
    } finally {
      setSaving("");
    }
  }

  async function onMedicalAssessment(event: SyntheticEvent) {
    event.preventDefault();
    setMedicalError("");
    setMedicalActionNotice("");
    if (assessment.trim().length < 5 || orders.trim().length < 5) {
      setMedicalError("Registre la evaluación y las indicaciones de urgencia.");
      return;
    }
    setSaving("medical-assessment");
    try {
      await postAction("medical-assessment", { assessment: assessment.trim(), orders: orders.trim() });
      setMedicalActionNotice("Se registró la atención médica y se cerró el evento. Continuidad en sala.");
      setAssessment("");
      setOrders("");
      await load();
    } catch (error_) {
      setMedicalError(errorText(error_, "No se pudo registrar la atención médica."));
    } finally {
      setSaving("");
    }
  }

  async function onRequestRrt(event: SyntheticEvent) {
    event.preventDefault();
    setErrReasonError("");
    if (errReason.trim().length < 5) {
      setErrReasonError("Indique por qué se requiere el equipo de respuesta rápida.");
      return;
    }
    setSaving("rrt-request");
    try {
      await postAction("rapid-response-request", { reason: errReason.trim() });
      setMedicalActionNotice("Se solicitó la intervención del equipo de respuesta rápida.");
      setErrReason("");
      await load();
    } catch (error_) {
      setErrReasonError(errorText(error_, "No se pudo solicitar el ERR."));
    } finally {
      setSaving("");
    }
  }

  async function onErrAssessment(event: SyntheticEvent) {
    event.preventDefault();
    setErrAssessmentError("");
    setErrNotice("");
    if (errAssessment.trim().length < 5) {
      setErrAssessmentError("Registre la evaluación del equipo de respuesta rápida.");
      return;
    }
    setSaving("err-assessment");
    try {
      await postAction("err-assessment", { assessment: errAssessment.trim(), transferToIcu });
      setErrNotice(
        transferToIcu
          ? "Se emitió la orden de UCI. Médico y enfermera deben autorizarla."
          : "Paciente estabilizado; la alerta se cerró en sala general.",
      );
      await load();
    } catch (error_) {
      setErrAssessmentError(errorText(error_, "No se pudo registrar la evaluación del ERR."));
    } finally {
      setSaving("");
    }
  }

  async function onIcuAuthorize() {
    setSaving("icu-authorize");
    setIcuError("");
    setIcuNotice("");
    try {
      await postAction("icu-authorize", null);
      setIcuNotice("Autorización de traslado a UCI registrada.");
      await load();
    } catch (error_) {
      setIcuError(errorText(error_, "No se pudo autorizar el traslado."));
    } finally {
      setSaving("");
    }
  }

  async function onIcuTransfer(event: SyntheticEvent) {
    event.preventDefault();
    setSaving("icu-transfer");
    setIcuError("");
    setIcuNotice("");
    try {
      await postAction("icu-transfer", { service: "UCI", room: icuRoom.trim(), bed: icuBed.trim() || undefined });
      setIcuNotice("Traslado efectivo a UCI registrado. La ubicación del ingreso se actualizó.");
      await load();
    } catch (error_) {
      setIcuError(errorText(error_, "No se pudo registrar el traslado a UCI."));
    } finally {
      setSaving("");
    }
  }

  async function onIcuReturn(event: SyntheticEvent) {
    event.preventDefault();
    setSaving("icu-return");
    setIcuError("");
    setIcuNotice("");
    try {
      await postAction("icu-return", {
        service: returnService.trim(),
        room: returnRoom.trim(),
        bed: returnBed.trim() || undefined,
        note: returnNote.trim() || undefined,
      });
      setIcuNotice("Retorno a sala registrado. La alerta quedó cerrada con trazabilidad completa.");
      await load();
    } catch (error_) {
      setIcuError(errorText(error_, "No se pudo registrar el retorno a sala."));
    } finally {
      setSaving("");
    }
  }

  if (loading) return <LoadingState label="Cargando el evento…" />;
  if (!alert) return <Feedback tone="error">{pageError || "No se encontró el evento."}</Feedback>;

  const closed = alert.status === "cerrada";
  const pendingAck = alert.needsSiren
    && !["orden_uci", "uci_autorizada", "en_uci"].includes(alert.status);
  const canNurseCare = NURSING_ROLES.has(role) && !closed && alert.status === "en_atencion";
  const canSchedule = canNurseCare && Boolean(alert.reassessedAt) && (alert.news2Total ?? 1) < 1;
  const isDoctor = MEDICAL_ROLES.has(role);
  const isRrt = role === "equipo_respuesta_rapida";
  const icu = alert.icuTransfer;
  const canAuthorizeIcu = !closed
    && alert.status === "orden_uci"
    && ((isDoctor && !icu?.doctorAuthorized) || (role === "enfermera_piso" && !icu?.nurseAuthorized));
  const canTransferIcu = !closed
    && alert.status === "uci_autorizada"
    && ["enfermera_piso", "enfermera_supervisora", "camillero"].includes(role);
  const canReturnIcu = !closed
    && alert.status === "en_uci"
    && NURSING_ROLES.has(role);

  return (
    <Sheet kicker="Gestión de alertas" title="Evento de alerta" wide clinic="file" className="floor-care">
      <p className="lead">
        {alert.patientName ?? alert.encounterId} · {alert.location ?? "Ubicación no registrada"}
      </p>
      <output className={`news news-${severityVisual(alert.severity)}`} aria-label="Estado de la alerta">
        {alert.news2Total !== null ? `NEWS2 ${alert.news2Total} · ` : ""}
        {STATUS_LABEL[alert.status]}
        {alert.followUpDueAt && alert.status === "en_atencion"
          ? ` · Completar antes de ${formatDateTime(alert.followUpDueAt)}`
          : ""}
      </output>
      {pageError ? <Feedback tone="error">{pageError}</Feedback> : null}
      <p className="hint">
        <Link to={`/atencion/chart?ingreso=${encodeURIComponent(alert.encounterId)}`}>Ver en el expediente clínico</Link>
      </p>

      <div className="split-board">
      <div className="stack">
      {pendingAck && !closed ? (
        <section className="result-block" aria-label="Confirmación de lectura">
          {ackError ? <Feedback tone="error">{ackError}</Feedback> : null}
          {ackNotice ? <Feedback tone="success">{ackNotice}</Feedback> : null}
          <FormActions>
            <Button type="button" disabled={saving === "acknowledge"} onClick={() => void onAcknowledge()}>
              {saving === "acknowledge" ? "Confirmando…" : "Confirmar recepción"}
            </Button>
            <Link to="/alertas">Volver a la bandeja</Link>
          </FormActions>
        </section>
      ) : null}

      {canNurseCare ? (
        <>
          <div className="chart-tabs" role="tablist" aria-label="Acciones de enfermería">
            {([
              { id: "vitals" as const, label: "Nueva toma / NEWS2" },
              { id: "deterioro" as const, label: "Deterioro / preocupación clínica" },
            ]).map((item) => {
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
            <div className="chart-tab-panel" role="tabpanel" id={`${tabsId}-panel-vitals`} aria-labelledby={`${tabsId}-vitals`} aria-label="Nueva toma de constantes">
              <Feedback tone="info">
                Registre la nueva toma. Si el NEWS2 sigue ≥ 1, el sistema notifica al médico automáticamente. Si queda en 0, programe el control.
              </Feedback>
              {vitalsError ? <Feedback tone="error">{vitalsError}</Feedback> : null}
              {vitalsNotice ? <Feedback tone="success">{vitalsNotice}</Feedback> : null}
              <form className="stack" onSubmit={onReassess} noValidate>
                <div className="form-grid">
                  <UnitField id="alert-rr" label="Frecuencia respiratoria" unit="rpm" abbr="FR" inputMode="numeric" value={vitals.respiratoryRate} onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })} error={visibleVitalsErrors.respiratoryRate} />
                  <UnitField id="alert-spo2" label="Saturación" unit="%" abbr="SpO2" inputMode="numeric" value={vitals.oxygenSaturation} onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })} error={visibleVitalsErrors.oxygenSaturation} />
                  <BloodPressureField
                    systolicId="alert-sbp"
                    diastolicId="alert-dbp"
                    systolic={vitals.systolicBloodPressure}
                    diastolic={vitals.diastolicBloodPressure}
                    onSystolic={(value) => setVitals({ ...vitals, systolicBloodPressure: value })}
                    onDiastolic={(value) => setVitals({ ...vitals, diastolicBloodPressure: value })}
                    systolicError={visibleVitalsErrors.systolicBloodPressure}
                    diastolicError={visibleVitalsErrors.diastolicBloodPressure}
                  />
                  <UnitField id="alert-pulse" label="Pulso" unit="lpm" abbr="FC" inputMode="numeric" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} error={visibleVitalsErrors.pulse} />
                  <UnitField id="alert-temp" label="Temperatura" unit="°C" abbr="Temp" inputMode="decimal" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} error={visibleVitalsErrors.temperature} />
                </div>
                <SelectField id="alert-consciousness" label="Conciencia" value={consciousness} onChange={(e) => setConsciousness(e.target.value as Consciousness)}>
                  <option value="alert">Alerta</option>
                  <option value="confusion">Confusión</option>
                  <option value="voice">Responde a la voz</option>
                  <option value="pain">Responde al dolor</option>
                  <option value="unresponsive">No responde</option>
                </SelectField>
                <FormActions>
                  <Button type="submit" disabled={saving === "reassessment"}>
                    {saving === "reassessment" ? "Recalculando…" : "Recalcular NEWS2"}
                  </Button>
                </FormActions>
              </form>

              <section className="result-block" aria-label="Programación del control">
                <h3>Programar control (solo si NEWS2 = 0)</h3>
                {scheduleError ? <Feedback tone="error">{scheduleError}</Feedback> : null}
                {scheduleNotice ? (
                  <Feedback tone="success">
                    {scheduleNotice}{" "}
                    <Link to="/atencion/controles">Abrir bandeja de controles</Link>
                  </Feedback>
                ) : null}
                <form className="stack" onSubmit={onSchedule} noValidate>
                  <TextField
                    id="alert-frequency"
                    label="¿Cada cuántos minutos se repetirá el control?"
                    inputMode="numeric"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value.replace(/\D/g, ""))}
                    hint="Entre 15 minutos y 24 horas."
                  />
                  <TextAreaField id="alert-schedule-note" label="Observación del control (opcional)" rows={2} value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} />
                  <FormActions>
                    <Button type="submit" variant="quiet" disabled={saving === "schedule" || !canSchedule}>
                      {saving === "schedule" ? "Programando…" : "Programar control"}
                    </Button>
                  </FormActions>
                </form>
              </section>
            </div>
          ) : (
            <div className="chart-tab-panel" role="tabpanel" id={`${tabsId}-panel-deterioro`} aria-labelledby={`${tabsId}-deterioro`} aria-label="Deterioro clínico">
              <Feedback tone="info">
                Use esta pestaña si nota deterioro o preocupación clínica (nurse&apos;s worry) aunque aún no haya segunda toma. El médico recibe la alerta de inmediato.
              </Feedback>
              {medicalReasonError ? <Feedback tone="error">{medicalReasonError}</Feedback> : null}
              {medicalNotice ? (
                <Feedback tone="success">
                  {medicalNotice}{" "}
                  <Link to="/alertas">Ver bandeja de alertas</Link>
                </Feedback>
              ) : null}
              <form className="stack" onSubmit={onRequestMedical} noValidate>
                <TextAreaField
                  id="alert-medical-reason"
                  label="Motivo de la atención médica"
                  rows={3}
                  value={medicalReason}
                  onChange={(e) => setMedicalReason(e.target.value)}
                />
                <FormActions>
                  <Button type="submit" disabled={saving === "medical-request"}>
                    {saving === "medical-request" ? "Notificando…" : "Solicitar atención médica"}
                  </Button>
                </FormActions>
              </form>
            </div>
          )}
        </>
      ) : null}

      {isDoctor && !closed && !["orden_uci", "uci_autorizada", "en_uci"].includes(alert.status) ? (
        <section className="result-block" aria-label="Atención médica de urgencia">
          {medicalError ? <Feedback tone="error">{medicalError}</Feedback> : null}
          {errReasonError ? <Feedback tone="error">{errReasonError}</Feedback> : null}
          {medicalActionNotice ? <Feedback tone="success">{medicalActionNotice}</Feedback> : null}
          <h3>Evaluación e indicaciones de urgencia</h3>
          <form className="stack" onSubmit={onMedicalAssessment} noValidate>
            <TextAreaField id="alert-assessment" label="Evaluación del paciente" rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} />
            <TextAreaField id="alert-orders" label="Indicaciones médicas de urgencia" rows={3} value={orders} onChange={(e) => setOrders(e.target.value)} />
            <FormActions>
              <Button type="submit" disabled={saving === "medical-assessment" || pendingAck}>
                {saving === "medical-assessment" ? "Registrando…" : "Registrar atención médica"}
              </Button>
            </FormActions>
          </form>
          <form className="stack" onSubmit={onRequestRrt} noValidate>
            <h3>El paciente no se estabiliza</h3>
            <TextAreaField id="alert-rrt-reason" label="Motivo de la intervención especializada" rows={3} value={errReason} onChange={(e) => setErrReason(e.target.value)} />
            <FormActions>
              <Button type="submit" variant="quiet" disabled={saving === "rrt-request" || pendingAck}>
                {saving === "rrt-request" ? "Solicitando…" : "Solicitar equipo de respuesta rápida"}
              </Button>
            </FormActions>
          </form>
        </section>
      ) : null}

      {isRrt && !closed && (alert.status === "err_solicitado" || alert.status === "escalada_err") ? (
        <section className="result-block" aria-label="Evaluación del equipo de respuesta rápida">
          {errAssessmentError ? <Feedback tone="error">{errAssessmentError}</Feedback> : null}
          {errNotice ? <Feedback tone="success">{errNotice}</Feedback> : null}
          <form className="stack" onSubmit={onErrAssessment} noValidate>
            <TextAreaField id="alert-err-assessment" label="Evaluación del paciente" rows={3} value={errAssessment} onChange={(e) => setErrAssessment(e.target.value)} />
            <CheckField id="alert-icu" label="Requiere traslado a cuidados intensivos" checked={transferToIcu} onChange={(e) => setTransferToIcu(e.target.checked)} />
            <FormActions>
              <Button type="submit" disabled={saving === "err-assessment" || pendingAck}>
                {saving === "err-assessment" ? "Registrando…" : "Registrar evaluación del equipo"}
              </Button>
            </FormActions>
          </form>
        </section>
      ) : null}

      {!closed && icu?.ordered ? (
        <section className="result-block" aria-label="Ciclo de traslado a UCI">
          <h3>Traslado a UCI</h3>
          <ul className="hint">
            <li>Orden: {icu.orderedAt ? formatDateTime(icu.orderedAt) : "—"}</li>
            <li>Autorización médica: {icu.doctorAuthorized ? formatDateTime(icu.doctorAuthorizedAt) : "Pendiente"}</li>
            <li>Autorización enfermería: {icu.nurseAuthorized ? formatDateTime(icu.nurseAuthorizedAt) : "Pendiente"}</li>
            <li>Traslado efectivo: {icu.transferredAt ? formatDateTime(icu.transferredAt) : "Pendiente"}</li>
            <li>Retorno a sala: {icu.returnedAt ? formatDateTime(icu.returnedAt) : "—"}</li>
          </ul>
          {icuError ? <Feedback tone="error">{icuError}</Feedback> : null}
          {icuNotice ? <Feedback tone="success">{icuNotice}</Feedback> : null}
          {canAuthorizeIcu ? (
            <FormActions>
              <Button type="button" disabled={saving === "icu-authorize"} onClick={() => void onIcuAuthorize()}>
                {saving === "icu-authorize" ? "Autorizando…" : "Autorizar traslado a UCI"}
              </Button>
            </FormActions>
          ) : null}
          {canTransferIcu ? (
            <form className="stack" onSubmit={onIcuTransfer} noValidate>
              <div className="form-grid">
                <TextField id="icu-room" label="Unidad / habitación UCI" value={icuRoom} onChange={(e) => setIcuRoom(e.target.value)} />
                <TextField id="icu-bed" label="Lecho" value={icuBed} onChange={(e) => setIcuBed(e.target.value)} />
              </div>
              <FormActions>
                <Button type="submit" disabled={saving === "icu-transfer"}>
                  {saving === "icu-transfer" ? "Registrando…" : "Registrar traslado efectivo"}
                </Button>
              </FormActions>
            </form>
          ) : null}
          {canReturnIcu ? (
            <form className="stack" onSubmit={onIcuReturn} noValidate>
              <h3>Retorno a sala general</h3>
              <div className="form-grid">
                <TextField id="return-service" label="Servicio" value={returnService} onChange={(e) => setReturnService(e.target.value)} />
                <TextField id="return-room" label="Habitación" value={returnRoom} onChange={(e) => setReturnRoom(e.target.value)} />
                <TextField id="return-bed" label="Lecho" value={returnBed} onChange={(e) => setReturnBed(e.target.value)} />
              </div>
              <TextAreaField id="return-note" label="Observación (opcional)" rows={2} value={returnNote} onChange={(e) => setReturnNote(e.target.value)} />
              <FormActions>
                <Button type="submit" disabled={saving === "icu-return"}>
                  {saving === "icu-return" ? "Registrando…" : "Registrar retorno a sala"}
                </Button>
              </FormActions>
            </form>
          ) : null}
        </section>
      ) : null}

      </div>
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
      </div>
    </Sheet>
  );
}
