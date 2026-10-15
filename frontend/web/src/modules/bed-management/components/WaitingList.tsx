import { Button } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { elapsedLabel } from "../domain/flowGuide";
import { priorityLabel, requestStatusLabel, requirementLabel, sourceLabel } from "../domain/priority";
import type { WaitingItem } from "../hooks/useBedBoard";

/** Lista de espera priorizada (RF-70) con la cama sugerida real (RF-72). */
export function WaitingList({
  items,
  canAssign,
  onAssign,
  onNewRequest,
}: Readonly<{
  items: WaitingItem[];
  canAssign: boolean;
  onAssign: (item: WaitingItem) => void;
  onNewRequest?: () => void;
}>) {
  return (
    <Panel
      title="Lista de espera priorizada"
      aside={
        <>
          <StatusPill tone={items.length > 0 ? "danger" : "neutral"}>{items.length} pendientes</StatusPill>
          {onNewRequest ? <Button type="button" onClick={onNewRequest}>Nueva solicitud</Button> : null}
        </>
      }
    >
      {items.length === 0 ? (
        <output className="banner banner-info">
          No hay solicitudes en espera. Cuando urgencias, quirófano o admisión pidan una cama aparecerán aquí, ordenadas por gravedad.
        </output>
      ) : (
        <ul className="work-queue">
          {items.map(({ request, suggestion }) => {
            const name = request.patientName ?? `Solicitud ${request.id}`;
            return (
              <li key={request.id} className="wait-card">
                <div className="wait-card-head">
                  <span className={`status-pill priority-${request.priority}`}>{priorityLabel(request.priority)}</span>
                  <span className="wait-card-meta">
                    {sourceLabel(request.source)} · {elapsedLabel(request.requestedAt)}
                  </span>
                </div>
                <h4>{name}</h4>
                <p className="wait-card-meta">{requestStatusLabel(request.status)}</p>
                <p className={`wait-card-need${request.isolation ? " is-isolation" : ""}`}>{requirementLabel(request)}</p>
                <div className="wait-card-action">
                  <span className="wait-card-meta">
                    {suggestion ? `Sugerida: ${suggestion.room}-${suggestion.bedCode}` : "Sin lecho compatible disponible"}
                  </span>
                  {canAssign ? (
                    <Button
                      type="button"
                      aria-label={`Asignar lecho compatible a ${name}`}
                      disabled={!suggestion}
                      onClick={() => onAssign({ request, suggestion })}
                    >
                      Asignar lecho compatible
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
