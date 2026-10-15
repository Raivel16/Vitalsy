import { useState } from "react";
import { Link } from "react-router";
import { IconBell, IconBellRinging } from "@tabler/icons-react";
import { formatDateTime } from "../../../shared/datetime/format";
import { STATUS_LABEL, severityVisual, type ClinicalAlert } from "../domain/alert";

export function AlertBell({ alerts }: Readonly<{ alerts: ClinicalAlert[] }>) {
  const [open, setOpen] = useState(false);
  const worklist = alerts.length;
  const urgent = alerts.filter((alert) => alert.needsSiren).length;

  const label = worklist === 0
    ? "Sin alertas pendientes"
    : urgent > 0
      ? `${urgent} ${urgent === 1 ? "alerta urgente" : "alertas urgentes"}`
      : `${worklist} ${worklist === 1 ? "alerta en seguimiento" : "alertas en seguimiento"}`;

  const Icon = urgent > 0 ? IconBellRinging : IconBell;

  return (
    <div className="bell">
      <button
        type="button"
        className="bell-button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon size={20} stroke={1.75} aria-hidden />
        {worklist > 0 ? <span className="bell-badge" aria-hidden>{worklist}</span> : null}
      </button>
      {open ? (
        <section className="bell-panel" aria-label="Alertas pendientes">
          {worklist === 0 ? (
            <p className="hint">No tiene alertas pendientes en este momento.</p>
          ) : (
            <ul>
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <p><strong>{alert.patientName ?? alert.encounterId}</strong></p>
                  <p className="hint">{alert.location ?? "Ubicación no registrada"}</p>
                  <p className={`news news-${severityVisual(alert.severity)}`}>
                    {alert.news2Total !== null ? `NEWS2 ${alert.news2Total} · ` : ""}
                    {STATUS_LABEL[alert.status]}
                    {alert.needsSiren ? " · Requiere confirmación" : ""}
                  </p>
                  <p className="hint">Generada {formatDateTime(alert.generatedAt)}</p>
                  <Link to={`/alertas/${alert.id}`} onClick={() => setOpen(false)}>Abrir el evento</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
