import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { StatTile } from "../../../shared/ui/clinical";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { formatDateTime } from "../../../shared/datetime/format";
import { STATUS_LABEL, severityVisual, type ClinicalAlert } from "../domain/alert";
import { notifyAlertAcknowledged } from "../domain/inboxEvents";

type InboxFilter = "todas" | "confirmar" | "seguimiento";

export function AlertInboxPage() {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("todas");

  const load = useCallback(async () => {
    try {
      const data = await api<{ alerts: ClinicalAlert[] }>("/api/v1/clinical-alerts/inbox");
      setAlerts(data.alerts);
      setError("");
    } catch (error_) {
      setError(errorText(error_, "No se pudieron cargar las alertas."));
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
      notifyAlertAcknowledged(alert.id);
      setNotice(`Confirmó la recepción de la alerta de ${alert.patientName ?? "el paciente"}.`);
      await load();
    } catch (error_) {
      setError(errorText(error_, "No se pudo confirmar la recepción."));
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const confirmar = alerts.filter((alert) => alert.needsSiren).length;
    const seguimiento = alerts.filter((alert) => !alert.needsSiren && alert.status !== "cerrada").length;
    return { todas: alerts.length, confirmar, seguimiento };
  }, [alerts]);

  const visible = useMemo(() => {
    if (filter === "confirmar") return alerts.filter((alert) => alert.needsSiren);
    if (filter === "seguimiento") return alerts.filter((alert) => !alert.needsSiren && alert.status !== "cerrada");
    return alerts;
  }, [alerts, filter]);

  if (loading) return <LoadingState label="Cargando alertas…" />;

  return (
    <Sheet kicker="Gestión de alertas" title="Alertas pendientes" wide clinic="board" className="floor-care">
      <p className="lead">
        Confirme la lectura para callar la sirena y continúe con la reevaluación del paciente. La alerta permanece
        abierta hasta programar un nuevo control o solicitar atención médica. Si no se completa en 15 minutos, la
        sirena vuelve a sonar.
      </p>

      <div className="alert-summary" aria-label="Resumen de alertas">
        <StatTile label="Por confirmar" value={counts.confirmar} tone={counts.confirmar > 0 ? "danger" : "neutral"} />
        <StatTile label="En seguimiento" value={counts.seguimiento} tone="info" />
        <StatTile label="En bandeja" value={counts.todas} />
      </div>

      <div className="filter-pills" role="group" aria-label="Filtrar alertas">
        <button type="button" className={`filter-pill${filter === "todas" ? " is-active" : ""}`} aria-pressed={filter === "todas"} onClick={() => setFilter("todas")}>
          Todas las alertas ({counts.todas})
        </button>
        <button type="button" className={`filter-pill${filter === "confirmar" ? " is-active" : ""}`} aria-pressed={filter === "confirmar"} onClick={() => setFilter("confirmar")}>
          Requieren confirmación ({counts.confirmar})
        </button>
        <button type="button" className={`filter-pill${filter === "seguimiento" ? " is-active" : ""}`} aria-pressed={filter === "seguimiento"} onClick={() => setFilter("seguimiento")}>
          En seguimiento ({counts.seguimiento})
        </button>
      </div>

      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de la alerta">{notice}</Feedback> : null}
      {visible.length === 0 ? (
        <Feedback tone="info">No tiene alertas pendientes en este momento.</Feedback>
      ) : (
        <ul className="alert-list">
          {visible.map((alert) => (
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
                {alert.followUpDueAt && alert.status === "en_atencion"
                  ? ` · Completar atención antes de ${formatDateTime(alert.followUpDueAt)}`
                  : ""}
              </p>
              <div className="alert-card-actions">
                {alert.needsSiren ? (
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
