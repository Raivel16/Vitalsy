import { useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { GENDER_OPTIONS, SPECIALTY_OPTIONS } from "../domain/infrastructureForm";
import type { InfraBed, InfraWard } from "../types";

const genderLabel = (value: string) => GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
const specialtyLabel = (value: string) => SPECIALTY_OPTIONS.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
const STATUS_LABEL: Record<string, string> = { available: "Disponible", occupied: "Ocupada", cleaning: "En limpieza", blocked: "Bloqueada" };

export type InfraActions = {
  onToggleBed: (bed: InfraBed) => void;
  onDeleteBed: (bed: InfraBed) => void;
  onToggleWard: (ward: InfraWard) => void;
  onDeleteWard: (ward: InfraWard) => void;
};

/** Borrado con confirmación en dos pasos: es lógico y conserva el historial. */
function DeleteButton({ subject, label, onConfirm }: Readonly<{ subject: string; label: string; onConfirm: () => void }>) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <Button type="button" variant="quiet" onClick={() => setConfirming(true)}>{`Borrar ${subject}`}</Button>;
  }
  return (
    <span className="inline-confirm">
      <span className="hint">Se oculta de la operación y se conserva el historial.</span>
      <Button type="button" aria-label={`Confirmar borrado de ${label}`} onClick={() => { setConfirming(false); onConfirm(); }}>Sí, borrar</Button>
      <Button type="button" variant="quiet" aria-label={`Cancelar borrado de ${label}`} onClick={() => setConfirming(false)}>Cancelar</Button>
    </span>
  );
}

function BedRow({ bed, actions }: Readonly<{ bed: InfraBed; actions: InfraActions }>) {
  const name = `${bed.room}-${bed.bedCode}`;
  return (
    <tr>
      <td>{bed.room}</td>
      <td>{bed.bedCode}</td>
      <td>{genderLabel(bed.genderPolicy)}</td>
      <td>{bed.isolation ? "Sí" : "No"}</td>
      <td>{STATUS_LABEL[bed.status] ?? bed.status}</td>
      <td><StatusPill tone={bed.active ? "success" : "neutral"}>{bed.active ? "Activa" : "Desactivada"}</StatusPill></td>
      <td className="row-actions">
        <Button type="button" variant="quiet" onClick={() => actions.onToggleBed(bed)}>
          {`${bed.active ? "Desactivar" : "Activar"} cama ${name}`}
        </Button>
        <DeleteButton subject={`cama ${name}`} label={`la cama ${name}`} onConfirm={() => actions.onDeleteBed(bed)} />
      </td>
    </tr>
  );
}

export function WardCard({ ward, actions }: Readonly<{ ward: InfraWard; actions: InfraActions }>) {
  return (
    <Panel
      title={ward.name}
      aside={
        <>
          <StatusPill tone={ward.active ? "success" : "neutral"}>{ward.active ? "Activo" : "Desactivado"}</StatusPill>
          <Button type="button" variant="quiet" onClick={() => actions.onToggleWard(ward)}>
            {`${ward.active ? "Desactivar" : "Activar"} pabellón ${ward.code}`}
          </Button>
          <DeleteButton subject={`pabellón ${ward.code}`} label={`el pabellón ${ward.code}`} onConfirm={() => actions.onDeleteWard(ward)} />
        </>
      }
    >
      <p className="hint">{ward.code} · {specialtyLabel(ward.specialty)} · {ward.beds.length} cama(s)</p>
      {ward.beds.length === 0 ? (
        <p className="hint">Este pabellón aún no tiene camas. Use «Nueva cama» o «Alta en lote».</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Habitación</th>
              <th scope="col">Cama</th>
              <th scope="col">Género</th>
              <th scope="col">Aislamiento</th>
              <th scope="col">Estado</th>
              <th scope="col">Habilitación</th>
              <th scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>{ward.beds.map((bed) => <BedRow key={bed.id} bed={bed} actions={actions} />)}</tbody>
        </table>
      )}
    </Panel>
  );
}
