import { type FormEvent, useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router";
import { IconChecklist, IconNotes } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { SelectField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { DateRangeFilter, DaySection } from "../../../shared/ui/DateRangeFilter";
import { formatDate, formatDateTime, formatTime } from "../../../shared/datetime/format";
import {
  groupByDay,
  isWithinDateRange,
  resolveDateRange,
  type DateRangeValue,
} from "../../../shared/datetime/range";
import { requiredText } from "../../../shared/validation/inputRules";

const CARE_OPTIONS = [
  "Higiene matutina",
  "Cambio de ropa / sábanas",
  "Alimentación asistida",
  "Movilización / deambulación",
  "Higiene de manos / oral",
  "Otros",
];

type Note = { id: number; body: string; authorName: string | null; authoredAt: string | null };
type Activity = {
  id: number;
  activityLabel: string;
  completedAt: string | null;
  completedByName?: string | null;
};

type CareTab = "notas" | "actividades";

const TABS: { id: CareTab; label: string; icon: typeof IconNotes }[] = [
  { id: "notas", label: "Notas", icon: IconNotes },
  { id: "actividades", label: "Actividades", icon: IconChecklist },
];

export function NursingEvolutionCarePage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const tabsId = useId();

  const [tab, setTab] = useState<CareTab>("notas");
  const [range, setRange] = useState<DateRangeValue>(() => resolveDateRange("30d"));
  const [body, setBody] = useState("");
  const [careOption, setCareOption] = useState(CARE_OPTIONS[0]);
  const [careOther, setCareOther] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [careError, setCareError] = useState("");

  function loadNotes() {
    if (!ingreso) return;
    api<{ notes: Note[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/nursing-evolution-notes`)
      .then((data) => setNotes(data.notes))
      .catch(() => undefined);
  }

  function loadActivities() {
    if (!ingreso) return;
    api<{ activities: Activity[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/care-activities`)
      .then((data) => setActivities(data.activities))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadNotes();
    loadActivities();
  }, [ingreso]);

  async function onNursingNote(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const message = requiredText(body, "La nota de evolución de enfermería es obligatoria.") ?? "";
    if (message) {
      setFieldError(message);
      return;
    }
    if (body.trim().length < 5) {
      setFieldError("La nota debe tener al menos 5 caracteres.");
      return;
    }
    setFieldError("");
    setError("");
    setNotice("");
    try {
      const data = await api<{ note: Note }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/nursing-evolution-notes`,
        { method: "POST", body: JSON.stringify({ body: body.trim() }) },
      );
      setNotes((prev) => [data.note, ...prev]);
      setNotice("Nota de enfermería registrada.");
      setBody("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la nota."));
    }
  }

  async function onCare(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const label = careOption === "Otros" ? careOther.trim() : careOption;
    if (!label || label.length < 3) {
      setCareError(careOption === "Otros" ? "Describa la actividad (mínimo 3 caracteres)." : "Seleccione una actividad.");
      return;
    }
    setCareError("");
    setError("");
    setNotice("");
    try {
      const data = await api<{ activity: Activity }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/care-activities`,
        { method: "POST", body: JSON.stringify({ activityLabel: label }) },
      );
      setActivities((prev) => [data.activity, ...prev]);
      setNotice(`Cuidado directo registrado: ${label}.`);
      setCareOther("");
      setCareOption(CARE_OPTIONS[0]);
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar el cuidado."));
    }
  }

  if (!ingreso) {
    return (
      <Sheet kicker="Cuidados del turno" title="Cuidados y evolución de enfermería" wide clinic="file" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado para documentar cuidados." />
      </Sheet>
    );
  }

  const filteredNotes = notes.filter((note) => isWithinDateRange(note.authoredAt, range));
  const filteredActivities = activities.filter((item) => isWithinDateRange(item.completedAt, range));
  const noteGroups = groupByDay(filteredNotes, (note) => note.authoredAt, formatDate);
  const activityGroups = groupByDay(filteredActivities, (item) => item.completedAt, formatDate);

  return (
      <Sheet kicker="Cuidados del turno" title="Cuidados y evolución de enfermería" wide clinic="file" className="floor-care">
      <p className="lead">
        Documente la evolución del turno y los cuidados básicos
        {encounter ? ` de ${encounter.patientName}` : ""}. Disponible para enfermera de piso y auxiliar.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}

      <div className="chart-tabs" role="tablist" aria-label="Acciones de cuidados">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabsId}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${item.id}`}
              className={selected ? "chart-tab is-active" : "chart-tab"}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={18} stroke={1.75} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      <DateRangeFilter value={range} onChange={setRange} label="Filtrar historial de cuidados" />

      {tab === "notas" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-notas`}
          aria-labelledby={`${tabsId}-notas`}
          aria-label="Notas"
        >
          <div className="split-board">
          <form className="stack clinical-panel" onSubmit={onNursingNote} noValidate>
            <h3>Evolución de enfermería</h3>
            <p className="hint">Documente estado clínico, intervenciones y respuesta del paciente durante el turno.</p>
            <TextAreaField
              id="nurse-note"
              label="Nota de evolución"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              error={fieldError}
              rows={5}
              required
            />
            <FormActions>
              <Button type="submit">Registrar nota</Button>
            </FormActions>
          </form>
          <section className="result-block" aria-label="Notas registradas">
            <h3>Notas del ingreso</h3>
            {noteGroups.length === 0 ? (
              <Feedback tone="info">No hay notas en el rango seleccionado.</Feedback>
            ) : (
              noteGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Autor</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((note) => (
                          <tr key={note.id}>
                            <td>{formatTime(note.authoredAt)}</td>
                            <td>{note.authorName ?? "—"}</td>
                            <td>{note.body}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
          </div>
        </div>
      ) : null}

      {tab === "actividades" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-actividades`}
          aria-labelledby={`${tabsId}-actividades`}
          aria-label="Actividades"
        >
          <div className="split-board">
          <form className="stack clinical-panel" onSubmit={onCare} noValidate>
            <h3>Cuidados directos</h3>
            <p className="hint">
              Actividades básicas de confort e higiene (baño, cambio de ropa, alimentación, movilización).
              Seleccione la actividad y márquela como finalizada cuando la complete.
            </p>
            <SelectField
              id="care-option"
              label="Actividad realizada"
              value={careOption}
              onChange={(e) => setCareOption(e.target.value)}
              error={careError}
            >
              {CARE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </SelectField>
            {careOption === "Otros" ? (
              <TextField
                id="care-other"
                label="Describa la actividad"
                value={careOther}
                onChange={(e) => setCareOther(e.target.value)}
                required
              />
            ) : null}
            <FormActions>
              <Button type="submit">Marcar finalizado</Button>
            </FormActions>
          </form>
          <section className="result-block" aria-label="Cuidados registrados">
            <h3>Cuidados registrados</h3>
            {activityGroups.length === 0 ? (
              <Feedback tone="info">No hay actividades en el rango seleccionado.</Feedback>
            ) : (
              activityGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Registrado por</th>
                          <th>Actividad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.id}>
                            <td title={formatDateTime(item.completedAt)}>{formatTime(item.completedAt)}</td>
                            <td>{item.completedByName ?? "—"}</td>
                            <td>{item.activityLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
