import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { elapsedLabel } from "../domain/flowGuide";
import type { AssignmentNotification } from "../types";

/** Bandeja de la supervisora (RF-73): asignaciones realizadas por gestión de camas pendientes de reconocer. */
export function NotificationsPanel({
  items,
  busyId,
  onAcknowledge,
}: Readonly<{
  items: AssignmentNotification[];
  busyId: number | null;
  onAcknowledge: (item: AssignmentNotification) => void;
}>) {
  return (
    <Panel title="Asignaciones por confirmar" aside={`${items.length} nuevas`}>
      {items.length === 0 ? (
        <p className="hint">No hay asignaciones nuevas. Aquí llegará cada lecho que gestión de camas asigne.</p>
      ) : (
        <ul className="work-queue">
          {items.map((item) => {
            const name = item.patientName ?? item.encounterId;
            return (
              <li key={item.id} className="work-card">
                <p>
                  <strong>{name}</strong>
                </p>
                <p className="hint">
                  Lecho {item.room}-{item.bedCode} · {item.ward ?? "—"} · {elapsedLabel(item.assignedAt)}
                </p>
                <Button
                  type="button"
                  variant="quiet"
                  pending={busyId === item.id}
                  aria-label={`Confirmar recepción de la asignación de ${name}`}
                  onClick={() => onAcknowledge(item)}
                >
                  Confirmar recepción
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
