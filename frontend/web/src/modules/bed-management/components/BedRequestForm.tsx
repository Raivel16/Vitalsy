import { useEffect, useState, type SyntheticEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { CheckField, SelectField, TextField } from "../../../shared/ui/Field";
import {
  EQUIPMENT,
  ISOLATION_TYPES,
  PRIORITIES,
  SOURCES,
  emptyRequestForm,
  specialtyLabel,
  validateRequest,
  type Gender,
  type RequestForm,
} from "../domain/requests";
import type { PatientOption } from "../types";

const SEARCH_DELAY_MS = 250;

/** Solicitud de cama (RF-68): paciente elegido de los ingresos, perfil explícito y validación previa. */
export function BedRequestForm({
  specialties,
  busy,
  onSearch,
  onSubmit,
}: Readonly<{
  specialties: string[];
  busy: boolean;
  onSearch: (query: string) => Promise<PatientOption[]>;
  onSubmit: (form: RequestForm) => void;
}>) {
  const [form, setForm] = useState<RequestForm>(emptyRequestForm);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || form.patient) return;
    let active = true;
    const timer = setTimeout(() => {
      onSearch(term)
        .then((patients) => active && setResults(patients))
        .catch(() => active && setResults([]));
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, form.patient, onSearch]);

  const effective: RequestForm = { ...form, freeName: form.patient ? "" : query };
  const errors = submitted ? validateRequest(effective) : {};

  function choose(patient: PatientOption) {
    setForm({ ...form, patient, gender: patient.gender ?? form.gender });
    setQuery(patient.patientName);
    setResults([]);
  }

  function submit(event: SyntheticEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateRequest(effective)).length > 0) return;
    onSubmit(effective);
  }

  const toggleEquipment = (value: string) =>
    setForm({
      ...form,
      equipment: form.equipment.includes(value) ? form.equipment.filter((item) => item !== value) : [...form.equipment, value],
    });

  return (
    <form className="stack" onSubmit={submit} noValidate>
          <fieldset className="segmented">
            <legend>Origen del paciente</legend>
            {SOURCES.map((source) => (
              <label key={source.value}>
                <input
                  type="radio"
                  name="bed-source"
                  value={source.value}
                  checked={form.source === source.value}
                  onChange={() => setForm({ ...form, source: source.value })}
                />
                {source.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="segmented">
            <legend>Nivel de prioridad</legend>
            {PRIORITIES.map((priority) => (
              <label key={priority.value}>
                <input
                  type="radio"
                  name="bed-priority"
                  value={priority.value}
                  checked={form.priority === priority.value}
                  onChange={() => setForm({ ...form, priority: priority.value })}
                />
                {priority.label}
              </label>
            ))}
          </fieldset>

          <TextField
            id="bed-patient"
            label="Paciente"
            placeholder="Buscar por nombre o documento…"
            autoComplete="off"
            value={query}
            error={errors.patient}
            hint="Elija un resultado para vincular su ingreso; si no existe, se registra solo con el nombre."
            onChange={(event) => {
              setQuery(event.target.value);
              setForm({ ...form, patient: null });
            }}
          />
          {!form.patient && results.length > 0 ? (
            <ul className="patient-results" aria-label="Resultados de pacientes">
              {results.map((patient) => (
                <li key={patient.encounterId}>
                  <button type="button" className="patient-option" onClick={() => choose(patient)}>
                    {patient.patientName} · Doc. {patient.documentNumber}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {form.patient ? (
            <p className="hint">Ingreso vinculado: {form.patient.encounterId}. La ubicación del ingreso se actualizará al asignar.</p>
          ) : null}

          <div className="form-grid">
            <SelectField
              id="bed-specialty"
              label="Especialidad"
              value={form.specialty}
              error={errors.specialty}
              onChange={(event) => setForm({ ...form, specialty: event.target.value })}
            >
              <option value="">Seleccione…</option>
              {specialties.map((value) => (
                <option key={value} value={value}>{specialtyLabel(value)}</option>
              ))}
            </SelectField>
            <SelectField
              id="bed-gender"
              label="Género"
              value={form.gender}
              error={errors.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value as Gender | "" })}
            >
              <option value="">Seleccione…</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </SelectField>
          </div>

          <SelectField
            id="bed-isolation"
            label="Requerimientos de aislamiento"
            value={form.isolationType}
            onChange={(event) => setForm({ ...form, isolationType: event.target.value })}
          >
            {ISOLATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </SelectField>

          <fieldset className="equipment-list">
            <legend>Equipamiento requerido</legend>
            {EQUIPMENT.map((item) => (
              <CheckField
                key={item.value}
                id={`bed-equipment-${item.value}`}
                label={item.label}
                checked={form.equipment.includes(item.value)}
                onChange={() => toggleEquipment(item.value)}
              />
            ))}
          </fieldset>

          <Button type="submit" pending={busy}>{busy ? "Registrando…" : "Registrar solicitud"}</Button>
    </form>
  );
}
