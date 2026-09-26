import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useAuth } from "../../../app/AuthProvider";
import { Button } from "../../../shared/ui/Button";
import { CheckField, TextAreaField, TextField, SelectField } from "../../../shared/ui/Field";
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

const NURSING_ROLES = ["enfermera_piso", "enfermera_supervisora"];
const MEDICAL_ROLES = ["medico_residente", "medico_tratante"];

const emptyVitals = {
  respiratoryRate: "",
  oxygenSaturation: "",
  systolicBloodPressure: "",
  pulse: "",
  temperature: "",
};

export function AlertDetailPage() {
  const { alertId } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "enfermera_piso";

  const [alert, setAlert] = useState<ClinicalAlert | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [escalations, setEscalations] = useState<AlertEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");

  const [vitals, setVitals] = useState(emptyVitals);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [vitalsSubmitted, setVitalsSubmitted] = useState(false);
  const [frequency, setFrequency] = useState("60");
  const [scheduleNote, setScheduleNote] = useState("");
  const [frequencyError, setFrequencyError] = useState("");
  const [medicalReason, setMedicalReason] = useState("");
  const [medicalReasonError, setMedicalReasonError] = useState("");
  const [assessment, setAssessment] = useState("");
  const [orders, setOrders] = useState("");
  const [medicalError, setMedicalError] = useState("");
  const [errReason, setErrReason] = useState("");
  const [errReasonError, setErrReasonError] = useState("");
  const [errAssessment, setErrAssessment] = useState("");
  const [errAssessmentError, setErrAssessmentError] = useState("");
  const [transferToIcu, setTransferToIcu] = useState(false);

  const load = useCallback(async () => {
    if (!alertId) return;
    try {
      const data = await api<{ alert: ClinicalAlert; events: AlertEvent[]; escalations: AlertEscalation[] }>(
        `/api/v1/clinical-alerts/${encodeURIComponent(alertId)}/timeline`,
      );
      setAlert(data.alert);
      setEvents(data.events);
      setEscalations(data.escalations);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo cargar el evento."));
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(action: string, body: unknown, successMessage: string, label: string) {
    setSaving(label);
    setError("");
    setNotice("");
    try {
      await api(`/api/v1/clinical-alerts/${encodeURIComponent(String(alertId))}/${action}`, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setNotice(successMessage);
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la acción."));
    } finally {
      setSaving("");
    }
  }

  const vitalsErrors = validateVitalSigns(vitals);
  const visibleVitalsErrors = vitalsSubmitted ? vitalsErrors : {};

  async function onReassess(event: FormEvent) {
    event.preventDefault();
    setVitalsSubmitted(true);
    if (Object.keys(vitalsErrors).length > 0) return;

    await send(
      "reassessment",
      {
        respiratoryRate: Number(vitals.respiratoryRate),
        oxygenSaturation: Number(vitals.oxygenSaturation),
        systolicBloodPressure: Number(vitals.systolicBloodPressure),
        pulse: Number(vitals.pulse),
        temperature: Number(vitals.temperature.replace(",", ".")),
        consciousness,
      },
      "Se registró la nueva toma y se recalculó el NEWS2.",
      "reassessment",
    );
    setVitals(emptyVitals);
    setVitalsSubmitted(false);
  }

  async function onSchedule(event: FormEvent) {
    event.preventDefault();
    const minutes = Number(frequency);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) {
      setFrequencyError("Indique entre 15 y 1440 minutos.");
      return;
    }
    setFrequencyError("");
    await send(
      "monitoring-schedule",
      { frequencyMinutes: minutes, note: scheduleNote.trim() || undefined },
      "Se programó el próximo control y se cerró la alerta.",
      "schedule",
    );
  }

  async function onRequestMedical(event: FormEvent) {
    event.preventDefault();
    if (medicalReason.trim().length < 5) {
      setMedicalReasonError("Indique por qué el caso requiere atención médica.");
      return;
    }
    setMedicalReasonError("");
    await send(
      "medical-request",
      { reason: medicalReason.trim() },
      "Se notificó al médico de guardia con prioridad alta.",
      "medical-request",
    );
    setMedicalReason("");
  }

  async function onMedicalAssessment(event: FormEvent) {
    event.preventDefault();
    if (assessment.trim().length < 5 || orders.trim().length < 5) {
      setMedicalError("Registre la evaluación y las indicaciones de urgencia.");
      return;
    }
    setMedicalError("");
    await send(
      "medical-assessment",
      { assessment: assessment.trim(), orders: orders.trim() },
      "Se registró la atención médica de urgencia.",
      "medical-assessment",
    );
    setAssessment("");
    setOrders("");
  }

  async function onRequestRrt(event: FormEvent) {
    event.preventDefault();
    if (errReason.trim().length < 5) {
      setErrReasonError("Indique por qué se requiere el equipo de respuesta rápida.");
      return;
    }
    setErrReasonError("");
    await send(
      "rapid-response-request",
      { reason: errReason.trim() },
      "Se solicitó la intervención del equipo de respuesta rápida.",
      "rrt-request",
    );
    setErrReason("");
  }

  async function onErrAssessment(event: FormEvent) {
    event.preventDefault();
    if (errAssessment.trim().length < 5) {
      setErrAssessmentError("Registre la evaluación del equipo de respuesta rápida.");
      return;
    }
    setErrAssessmentError("");
    await send(
      "err-assessment",
      { assessment: errAssessment.trim(), transferToIcu },
      transferToIcu
        ? "Se registró la evaluación y la orden de traslado a cuidados intensivos."
        : "Se registró la evaluación; el paciente continúa en sala general.",
      "err-assessment",
    );
  }

  if (loading) return <LoadingState label="Cargando el evento…" />;
  if (!alert) return <Feedback tone="error">{error || "No se encontró el evento."}</Feedback>;

  const closed = alert.status === "cerrada";
  const pendingAck = ["abierta", "escalada_supervisora", "medico_notificado", "escalada_err"].includes(alert.status);
  const isNurse = NURSING_ROLES.includes(role);
  const isDoctor = MEDICAL_ROLES.includes(role);
  const isRrt = role === "equipo_respuesta_rapida";

  return (
    <Sheet kicker="Alertas clínicas" title="Evento de alerta" wide>
      <p className="lead">
        {alert.patientName ?? alert.encounterId} · {alert.location ?? "Ubicación no registrada"}
      </p>
      <p className={`news news-${severityVisual(alert.severity)}`} role="status" aria-label="Estado de la alerta">
        {alert.news2Total !== null ? `NEWS2 ${alert.news2Total} · ` : ""}
        {STATUS_LABEL[alert.status]}
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de la acción">{notice}</Feedback> : null}

      {pendingAck && !closed ? (
        <FormActions>
          <Button
            type="button"
            disabled={saving === "acknowledge"}
            onClick={() => void send("acknowledge", null, "Confirmó la recepción de la alerta.", "acknowledge")}
          >
            {saving === "acknowledge" ? "Confirmando…" : "Confirmar recepción"}
          </Button>
        </FormActions>
      ) : null}

      {isNurse && !closed ? (
        <>
          <section className="result-block" aria-label="Nueva toma de constantes">
            <h3>Nueva toma de constantes</h3>
            <form className="stack" onSubmit={onReassess} noValidate>
              <div className="form-grid">
                <TextField id="alert-rr" label="Frecuencia respiratoria" inputMode="numeric" value={vitals.respiratoryRate} onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })} error={visibleVitalsErrors.respiratoryRate} hint="respiraciones/min" />
                <TextField id="alert-spo2" label="Saturación" inputMode="numeric" value={vitals.oxygenSaturation} onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })} error={visibleVitalsErrors.oxygenSaturation} hint="%" />
                <TextField id="alert-sbp" label="Presión sistólica" inputMode="numeric" value={vitals.systolicBloodPressure} onChange={(e) => setVitals({ ...vitals, systolicBloodPressure: e.target.value })} error={visibleVitalsErrors.systolicBloodPressure} hint="mmHg" />
                <TextField id="alert-pulse" label="Pulso" inputMode="numeric" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} error={visibleVitalsErrors.pulse} hint="latidos/min" />
                <TextField id="alert-temp" label="Temperatura" inputMode="decimal" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} error={visibleVitalsErrors.temperature} hint="°C" />
              </div>
              <SelectField id="alert-consciousness" label="Conciencia" value={consciousness} onChange={(e) => setConsciousness(e.target.value as Consciousness)}>
                <option value="alert">Alerta</option>
                <option value="confusion">Confusión</option>
                <option value="voice">Responde a la voz</option>
                <option value="pain">Responde al dolor</option>
                <option value="unresponsive">No responde</option>
              </SelectField>
              <FormActions>
                <Button type="submit" variant="quiet" disabled={saving === "reassessment"}>
                  {saving === "reassessment" ? "Recalculando…" : "Recalcular NEWS2"}
                </Button>
              </FormActions>
            </form>
          </section>

          <section className="result-block" aria-label="Programación del control">
            <h3>Alteración aislada de baja severidad</h3>
            <form className="stack" onSubmit={onSchedule} noValidate>
              <TextField
                id="alert-frequency"
                label="¿Cada cuántos minutos se repetirá el control?"
                inputMode="numeric"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value.replace(/\D/g, ""))}
                error={frequencyError}
                hint="Entre 15 minutos y 24 horas."
              />
              <TextAreaField
                id="alert-schedule-note"
                label="Observación del control (opcional)"
                rows={2}
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
              />
              <FormActions>
                <Button type="submit" variant="quiet" disabled={saving === "schedule"}>
                  {saving === "schedule" ? "Programando…" : "Programar control"}
                </Button>
              </FormActions>
            </form>
          </section>

          <section className="result-block" aria-label="Solicitud de atención médica">
            <h3>Deterioro significativo o preocupación clínica</h3>
            <form className="stack" onSubmit={onRequestMedical} noValidate>
              <TextAreaField
                id="alert-medical-reason"
                label="Motivo de la atención médica"
                rows={3}
                value={medicalReason}
                onChange={(e) => setMedicalReason(e.target.value)}
                error={medicalReasonError}
              />
              <FormActions>
                <Button type="submit" disabled={saving === "medical-request"}>
                  {saving === "medical-request" ? "Notificando…" : "Solicitar atención médica"}
                </Button>
              </FormActions>
            </form>
          </section>
        </>
      ) : null}

      {isDoctor && !closed ? (
        <>
          <section className="result-block" aria-label="Atención médica de urgencia">
            <h3>Evaluación e indicaciones de urgencia</h3>
            <form className="stack" onSubmit={onMedicalAssessment} noValidate>
              <TextAreaField id="alert-assessment" label="Evaluación del paciente" rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} error={medicalError} />
              <TextAreaField id="alert-orders" label="Indicaciones médicas de urgencia" rows={3} value={orders} onChange={(e) => setOrders(e.target.value)} />
              <FormActions>
                <Button type="submit" disabled={saving === "medical-assessment"}>
                  {saving === "medical-assessment" ? "Registrando…" : "Registrar atención médica"}
                </Button>
              </FormActions>
            </form>
          </section>

          <section className="result-block" aria-label="Solicitud al equipo de respuesta rápida">
            <h3>El paciente no se estabiliza</h3>
            <form className="stack" onSubmit={onRequestRrt} noValidate>
              <TextAreaField id="alert-rrt-reason" label="Motivo de la intervención especializada" rows={3} value={errReason} onChange={(e) => setErrReason(e.target.value)} error={errReasonError} />
              <FormActions>
                <Button type="submit" variant="quiet" disabled={saving === "rrt-request"}>
                  {saving === "rrt-request" ? "Solicitando…" : "Solicitar equipo de respuesta rápida"}
                </Button>
              </FormActions>
            </form>
          </section>
        </>
      ) : null}

      {isRrt && !closed ? (
        <section className="result-block" aria-label="Evaluación del equipo de respuesta rápida">
          <h3>Evaluación del equipo de respuesta rápida</h3>
          <form className="stack" onSubmit={onErrAssessment} noValidate>
            <TextAreaField id="alert-err-assessment" label="Evaluación del paciente" rows={3} value={errAssessment} onChange={(e) => setErrAssessment(e.target.value)} error={errAssessmentError} />
            <CheckField
              id="alert-icu"
              label="Requiere traslado a cuidados intensivos"
              checked={transferToIcu}
              onChange={(e) => setTransferToIcu(e.target.checked)}
            />
            <FormActions>
              <Button type="submit" disabled={saving === "err-assessment"}>
                {saving === "err-assessment" ? "Registrando…" : "Registrar evaluación del equipo"}
              </Button>
            </FormActions>
          </form>
        </section>
      ) : null}

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
                {item.userName ? <p className="hint">{item.userName}</p> : null}
              </li>
            ))}
          </ol>
        )}
        {escalations.length > 0 ? (
          <ul className="hint">
            {escalations.map((item, index) => (
              <li key={index}>Escalada a {item.toRole} · {formatDateTime(item.escalatedAt)} · {item.reason}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </Sheet>
  );
}
