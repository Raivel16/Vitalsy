import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { SelectField } from "../../../shared/ui/Field";
import { priorityLabel } from "../domain/priority";
import type { Bed, BedRequest } from "../types";

export type AssignDraft = { request: BedRequest; bed: Bed; options: BedRequest[] };

/** Confirmación explícita antes de asignar (RF-73): muestra paciente, lecho y qué ocurrirá. */
export function AssignConfirm({
  draft,
  busy,
  onChangeRequest,
  onConfirm,
  onCancel,
}: Readonly<{
  draft: AssignDraft;
  busy: boolean;
  onChangeRequest: (requestId: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const { request, bed, options } = draft;

  return (
    <Panel title="Confirmar asignación">
      <div className="confirm-assign">
        {options.length > 1 ? (
          <SelectField
            id="assign-request"
            label="Solicitud a atender"
            value={String(request.id)}
            onChange={(event) => onChangeRequest(Number(event.target.value))}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.patientName ?? `Solicitud ${option.id}`} · {priorityLabel(option.priority)}
              </option>
            ))}
          </SelectField>
        ) : (
          <p>
            Paciente: <strong>{request.patientName ?? `Solicitud ${request.id}`}</strong>
          </p>
        )}
        <p>
          Lecho: <strong>{bed.room}-{bed.bedCode}</strong>
        </p>
        <p className="hint">
          {bed.ward ?? "Pabellón sin nombre"}. Al confirmar, el lecho pasa a ocupado y la enfermera supervisora recibe la notificación.
        </p>
        <div className="actions">
          <Button type="button" pending={busy} onClick={onConfirm}>Confirmar asignación</Button>
          <Button type="button" variant="quiet" disabled={busy} onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </Panel>
  );
}
