import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { formatDateTime } from "../../../shared/datetime/format";
import { STATUS_LABEL, severityVisual, type ClinicalAlert } from "../domain/alert";

export function AlertInboxPage() {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ alerts: ClinicalAlert[] }>("/api/v1/clinical-alerts/inbox");
      setAlerts(data.alerts);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudieron cargar las alertas."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function acknowledge(alert: ClinicalAlert) {
    setBusyId(alert.id);
    setError("");
    try {
      await api(`/api/v1/clinical-alerts/${alert.id}/acknowledge`, { method: "POST" });
      setNotice(`Confirmó la recepción de la alerta de ${alert.patientName ?? "el paciente"}.`);
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo confirmar la recepción."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando alertas…" />;

  return (
    <Sheet kicker="Alertas clínicas" title="Alertas pendientes" wide>
      <p className="lead">
        Confirme la recepción de cada alerta y continúe con la verificación del paciente. El tiempo de respuesta queda
        registrado.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de la alerta">{notice}</Feedback> : null}
      {alerts.length === 0 ? (
        <Feedback tone="info">No tiene alertas pendientes en este momento.</Feedback>
      ) : (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert-card alert-${severityVisual(alert.severity)}`}>
              <div className="alert-card-head">
                <div>
                  <h3>{alert.patientName ?? alert.encounterId}</h3>
                  <p className="hint">{alert.location ?? "Ubicación no registrada"}</p>
                </div>
                {alert.news2Total !== null ? (
                  <span className={`news news-${severityVisual(alert.severity)}`}>NEWS2 {alert.news2Total}</span>
                ) : (
                  <span className="news news-yellow">Deterioro observado</span>
                )}
              </div>
              <p>{alert.message}</p>
              <p className="hint">
                {STATUS_LABEL[alert.status]} · Generada {formatDateTime(alert.generatedAt)}
                {alert.acknowledgeDueAt ? ` · Confirmar antes de ${formatDateTime(alert.acknowledgeDueAt)}` : ""}
              </p>
              <div className="alert-card-actions">
                {alert.status === "abierta" || alert.status === "escalada_supervisora" || alert.status === "medico_notificado" || alert.status === "escalada_err" ? (
                  <Button type="button" disabled={busyId === alert.id} onClick={() => void acknowledge(alert)}>
                    {busyId === alert.id ? "Confirmando…" : "Confirmar recepción"}
                  </Button>
                ) : null}
                <Link to={`/alertas/${alert.id}`}>Abrir el evento</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
