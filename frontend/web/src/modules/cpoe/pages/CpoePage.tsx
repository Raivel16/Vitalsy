import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Panel } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { formatDateTime } from "../../../shared/datetime/format";
import { createRowKeys } from "../../../shared/list/rowKeys";
import { MEDICATION_FREQUENCIES, isListedFrequency, isPastFirstDose, toDateTimeInput } from "../domain/schedule";

/** En el formulario, `firstDoseAt` es el valor local del campo; hacia la API viaja como instante. */
type Item = { drugName: string; dose: string; route: string; frequency: string; firstDoseAt: string };
type ActiveItem = Omit<Item, "firstDoseAt"> & { id: number; firstDoseAt?: string | null; drugBarcode?: string };
type ActivePrescription = {
  id: number;
  status: string;
  signedAt: string | null;
  items: ActiveItem[];
};

const emptyItem = (): Item => ({ drugName: "", dose: "", route: "", frequency: "", firstDoseAt: "" });
const PAST_FIRST_DOSE = "La primera dosis no puede estar en el pasado.";

function isComplete(item: Item): boolean {
  return Boolean(item.drugName.trim() && item.dose.trim() && item.route.trim() && item.frequency && item.firstDoseAt);
}

function toPayload(item: Item) {
  return {
    drugName: item.drugName.trim(),
    dose: item.dose.trim(),
    route: item.route.trim(),
    frequency: item.frequency,
    firstDoseAt: new Date(item.firstDoseAt).toISOString(),
  };
}

function toForm(item: ActiveItem): Item {
  return {
    drugName: item.drugName,
    dose: item.dose,
    route: item.route,
    frequency: isListedFrequency(item.frequency) ? item.frequency : "",
    firstDoseAt: toDateTimeInput(item.firstDoseAt),
  };
}

function MedicationFields({ idPrefix, item, onChange }: Readonly<{ idPrefix: string; item: Item; onChange: (patch: Partial<Item>) => void }>) {
  return (
    <div className="form-grid">
      <TextField id={`${idPrefix}-drug`} label="Medicamento" value={item.drugName} onChange={(e) => onChange({ drugName: e.target.value })} required />
      <TextField id={`${idPrefix}-dose`} label="Dosis" value={item.dose} onChange={(e) => onChange({ dose: e.target.value })} required />
      <TextField id={`${idPrefix}-route`} label="Vía" value={item.route} onChange={(e) => onChange({ route: e.target.value })} required placeholder="VO, IV…" />
      <SelectField id={`${idPrefix}-freq`} label="Frecuencia" value={item.frequency} onChange={(e) => onChange({ frequency: e.target.value })} required>
        <option value="">Seleccione</option>
        {MEDICATION_FREQUENCIES.map((frequency) => (
          <option key={frequency} value={frequency}>{frequency}</option>
        ))}
      </SelectField>
      <TextField
        id={`${idPrefix}-first-dose`}
        label="Primera dosis"
        type="datetime-local"
        value={item.firstDoseAt}
        onChange={(e) => onChange({ firstDoseAt: e.target.value })}
        hint="Las siguientes dosis se calculan desde esta hora."
        required
      />
    </div>
  );
}

export function CpoePage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [active, setActive] = useState<ActivePrescription | null>(null);
  const [kardexMeds, setKardexMeds] = useState<string[]>([]);
  const rowKeys = useMemo(() => createRowKeys(), []);
  const [newLines, setNewLines] = useState<Item[]>([emptyItem()]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Item>(emptyItem());
  const [addForm, setAddForm] = useState<Item>(emptyItem());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyPlan(prescription: ActivePrescription | null, medications?: string[]) {
    setActive(prescription);
    if (medications) setKardexMeds(medications);
  }

  function loadPlan() {
    if (!ingreso) return;
    api<{ prescription: ActivePrescription | null }>(
      `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions/active`,
    )
      .then((data) => setActive(data.prescription))
      .catch(() => setActive(null));
    api<{ medications: string[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/kardex`)
      .then((data) => setKardexMeds(data.medications))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadPlan();
  }, [ingreso]);

  function updateNewLine(index: number, patch: Partial<Item>) {
    setNewLines((prev) => prev.map((item, i) => (i === index ? rowKeys.carry(item, { ...item, ...patch }) : item)));
  }

  async function onCreatePlan(event: SyntheticEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const cleaned = newLines.filter((item) => item.drugName.trim() || item.dose.trim() || item.frequency);
    if (cleaned.length === 0 || !cleaned.every(isComplete)) {
      setFieldError("Complete medicamento, dosis, vía, frecuencia y primera dosis en cada línea.");
      return;
    }
    if (cleaned.some((item) => isPastFirstDose(item.firstDoseAt))) {
      setFieldError(PAST_FIRST_DOSE);
      return;
    }
    setFieldError("");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions`,
        { method: "POST", body: JSON.stringify({ continuePlan: false, items: cleaned.map(toPayload) }) },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setNewLines([emptyItem()]);
      setNotice("Prescripción CPOE registrada. Las dosis ya están programadas en el e-MAR.");
    } catch (error_) {
      setError(errorText(error_, "No se pudo registrar la prescripción."));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(event: SyntheticEvent) {
    event.preventDefault();
    if (!ingreso || editingId == null) return;
    if (!isComplete(editForm)) {
      setFieldError("Complete todos los campos del medicamento.");
      return;
    }
    const original = active?.items.find((item) => item.id === editingId);
    const scheduleChanged = !original || editForm.frequency !== original.frequency || editForm.firstDoseAt !== toDateTimeInput(original.firstDoseAt);
    if (scheduleChanged && isPastFirstDose(editForm.firstDoseAt)) {
      setFieldError(PAST_FIRST_DOSE);
      return;
    }
    setFieldError("");
    setSaving(true);
    setError("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions/active/items/${editingId}`,
        { method: "PUT", body: JSON.stringify(toPayload(editForm)) },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setEditingId(null);
      setNotice("Medicamento actualizado.");
    } catch (error_) {
      setError(errorText(error_, "No se pudo actualizar el medicamento."));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteItem(itemId: number) {
    if (!ingreso) return;
    setSaving(true);
    setError("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions/active/items/${itemId}`,
        { method: "DELETE" },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setNotice("Medicamento eliminado del plan.");
    } catch (error_) {
      setError(errorText(error_, "No se pudo eliminar el medicamento."));
    } finally {
      setSaving(false);
    }
  }

  async function onAddItem(event: SyntheticEvent) {
    event.preventDefault();
    if (!ingreso) return;
    if (!isComplete(addForm)) {
      setFieldError("Complete todos los campos del medicamento a agregar.");
      return;
    }
    if (isPastFirstDose(addForm.firstDoseAt)) {
      setFieldError(PAST_FIRST_DOSE);
      return;
    }
    setFieldError("");
    setSaving(true);
    setError("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions/active/items`,
        { method: "POST", body: JSON.stringify(toPayload(addForm)) },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setAddForm(emptyItem());
      setNotice("Medicamento agregado al plan activo.");
    } catch (error_) {
      setError(errorText(error_, "No se pudo agregar el medicamento."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return (
      <Sheet kicker="Plan terapéutico" title="Prescripción electrónica (CPOE)" wide clinic="file" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado para gestionar la prescripción CPOE." />
      </Sheet>
    );
  }

  const hasActive = Boolean(active && active.items.length > 0);

  return (
    <Sheet kicker="Plan terapéutico" title="Prescripción electrónica (CPOE)" wide clinic="file" className="floor-care">
      <p className="lead">
        Gestione el plan terapéutico
        {encounter ? ` de ${encounter.patientName}` : ""}. Edite, elimine o agregue medicamentos de forma individual.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      {fieldError ? <Feedback tone="error">{fieldError}</Feedback> : null}

      <div className="split-board split-main">
      <div className="stack">
      <Panel title="Prescripción activa" aside={hasActive ? `Firmado vigente: ${formatDateTime(active!.signedAt)}` : undefined}>
        {!hasActive ? (
          <Feedback tone="info">No hay plan CPOE activo. Cree la primera prescripción abajo.</Feedback>
        ) : (
          <>
            <p className="hint">La enfermera administra desde e-MAR del turno.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th>Dosis</th>
                    <th>Vía</th>
                    <th>Frecuencia</th>
                    <th>Primera dosis</th>
                    <th>Código barras</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {active!.items.map((item) => (
                    <tr key={item.id}>
                      {editingId === item.id ? (
                        <td colSpan={7}>
                          <form className="stack" onSubmit={onSaveEdit} noValidate aria-label="Editar medicamento">
                            <MedicationFields idPrefix="edit" item={editForm} onChange={(patch) => setEditForm({ ...editForm, ...patch })} />
                            <FormActions>
                              <Button type="submit" disabled={saving}>Guardar</Button>
                              <Button type="button" variant="quiet" onClick={() => setEditingId(null)}>Cancelar</Button>
                            </FormActions>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td>{item.drugName}</td>
                          <td>{item.dose}</td>
                          <td>{item.route}</td>
                          <td>{item.frequency}</td>
                          <td>{formatDateTime(item.firstDoseAt)}</td>
                          <td><code>{item.drugBarcode}</code></td>
                          <td className="row-actions">
                            <Button type="button" variant="quiet" onClick={() => { setEditingId(item.id); setEditForm(toForm(item)); }}>Editar</Button>
                            <Button type="button" variant="quiet" onClick={() => void onDeleteItem(item.id)}>Eliminar</Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form className="stack result-block" onSubmit={onAddItem} noValidate aria-label="Agregar medicamento">
              <h3>Agregar medicamento al plan activo</h3>
              <p className="hint">Añada un medicamento individual al plan activo.</p>
              <MedicationFields idPrefix="add" item={addForm} onChange={(patch) => setAddForm({ ...addForm, ...patch })} />
              <FormActions>
                <Button type="submit" disabled={saving}>Agregar al plan</Button>
              </FormActions>
            </form>
          </>
        )}
      </Panel>

      {!hasActive ? (
        <Panel title="Nueva prescripción">
        <form className="stack" onSubmit={onCreatePlan} noValidate aria-label="Nueva prescripción">
          {newLines.map((item, index) => (
            <MedicationFields key={rowKeys.keyOf(item)} idPrefix={`line-${index}`} item={item} onChange={(patch) => updateNewLine(index, patch)} />
          ))}
          <FormActions>
            <Button type="button" variant="quiet" onClick={() => setNewLines((prev) => [...prev, emptyItem()])}>Agregar línea</Button>
            <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar CPOE"}</Button>
          </FormActions>
        </form>
        </Panel>
      ) : null}
      </div>

      <Panel title="Kardex electrónico">
        {kardexMeds.length === 0 ? (
          <Feedback tone="info">Sin medicamentos CPOE activos.</Feedback>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Indicación en Kardex</th></tr>
              </thead>
              <tbody>
                {kardexMeds.map((med) => (
                  <tr key={med}><td>{med}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </div>
    </Sheet>
  );
}
