import { useState, type SyntheticEvent } from "react";
import { formatDateTime } from "../../../shared/datetime/format";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import type { Projection } from "../types";

export type Occupant = { encounterId: string; patientName: string; location: string };

/** Fecha/hora local (`datetime-local`) → ISO; `null` si falta o es inválida. */
function toIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Proyección de altas (RF-71): la supervisora alimenta la disponibilidad futura del censo. */
export function ProjectionPanel({
  canWrite,
  occupants,
  projections,
  busy,
  onSubmit,
}: {
  canWrite: boolean;
  occupants: Occupant[];
  projections: Projection[];
  busy: boolean;
  onSubmit: (encounterId: string, projectedAt: string) => Promise<boolean>;
}) {
  const [encounterId, setEncounterId] = useState("");
  const [when, setWhen] = useState("");

  const [errors, setErrors] = useState<{ patient?: string; when?: string }>({});

  function validate(): { patient?: string; when?: string; iso: string | null } {
    const iso = toIso(when);
    return {
      iso,
      patient: encounterId === "" ? "Seleccione al paciente internado." : undefined,
      when: !iso
        ? "Indique la fecha y hora previstas de alta."
        : new Date(iso).getTime() <= Date.now()
          ? "La fecha prevista debe ser futura."
          : undefined,
    };
  }

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    const result = validate();
    setErrors({ patient: result.patient, when: result.when });
    if (result.patient || result.when || !result.iso) return;
    if (await onSubmit(encounterId, result.iso)) {
      setEncounterId("");
      setWhen("");
      setErrors({});
    }
  }

  return (
    <Panel title="Proyección de altas" aside={`${projections.length} vigentes`}>
      {canWrite ? (
        <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
          <SelectField
            id="projection-patient"
            label="Paciente internado"
            value={encounterId}
            error={errors.patient}
            onChange={(event) => setEncounterId(event.target.value)}
          >
            <option value="">Seleccione…</option>
            {occupants.map((occupant) => (
              <option key={occupant.encounterId} value={occupant.encounterId}>
                {occupant.patientName} · {occupant.location}
              </option>
            ))}
          </SelectField>
          <TextField
            id="projection-when"
            type="datetime-local"
            label="Alta prevista"
            value={when}
            error={errors.when}
            hint="Hora estimada en que el paciente dejará la cama."
            onChange={(event) => setWhen(event.target.value)}
          />
          <Button type="submit" pending={busy}>Registrar proyección</Button>
        </form>
      ) : null}

      {projections.length === 0 ? (
        <p className="hint">Aún no hay altas proyectadas para hoy en adelante.</p>
      ) : (
        <ul className="work-queue">
          {projections.map((projection) => (
            <li key={projection.id} className="work-card">
              <p>
                <strong>{projection.patientName ?? projection.encounterId}</strong>
              </p>
              <p className="hint">Alta prevista: {formatDateTime(projection.projectedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
