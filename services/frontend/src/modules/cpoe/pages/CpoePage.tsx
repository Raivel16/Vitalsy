import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { formatDateTime } from "../../../shared/datetime/format";

type Item = { drugName: string; dose: string; route: string; frequency: string };
type ActiveItem = Item & { id: number; drugBarcode?: string };
type ActivePrescription = {
  id: number;
  status: string;
  signedAt: string | null;
  items: ActiveItem[];
};

const emptyItem = (): Item => ({ drugName: "", dose: "", route: "", frequency: "" });

export function CpoePage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [active, setActive] = useState<ActivePrescription | null>(null);
  const [kardexMeds, setKardexMeds] = useState<string[]>([]);
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
    setNewLines((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onCreatePlan(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const cleaned = newLines
      .map((item) => ({
        drugName: item.drugName.trim(),
        dose: item.dose.trim(),
        route: item.route.trim(),
        frequency: item.frequency.trim(),
      }))
      .filter((item) => item.drugName || item.dose || item.frequency);
    if (cleaned.length === 0 || cleaned.some((item) => !item.drugName || !item.dose || !item.route || !item.frequency)) {
      setFieldError("Complete medicamento, dosis, vía y frecuencia en cada línea.");
      return;
    }
    setFieldError("");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions`,
        { method: "POST", body: JSON.stringify({ continuePlan: false, items: cleaned }) },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setNewLines([emptyItem()]);
      setNotice("Prescripción CPOE registrada. La enfermera verá las dosis en e-MAR del turno.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la prescripción."));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!ingreso || editingId == null) return;
    setSaving(true);
    setError("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions/active/items/${editingId}`,
        { method: "PUT", body: JSON.stringify(editForm) },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setEditingId(null);
      setNotice("Medicamento actualizado.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo actualizar el medicamento."));
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
    } catch (caught) {
      setError(errorText(caught, "No se pudo eliminar el medicamento."));
    } finally {
      setSaving(false);
    }
  }

  async function onAddItem(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    if (!addForm.drugName.trim() || !addForm.dose.trim() || !addForm.route.trim() || !addForm.frequency.trim()) {
      setFieldError("Complete todos los campos del medicamento a agregar.");
      return;
    }
    setFieldError("");
    setSaving(true);
    setError("");
    try {
      const data = await api<{ prescription: ActivePrescription; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions/active/items`,
        { method: "POST", body: JSON.stringify(addForm) },
      );
      applyPlan(data.prescription, data.kardex.medications);
      setAddForm(emptyItem());
      setNotice("Medicamento agregado al plan activo.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo agregar el medicamento."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado para gestionar la prescripción CPOE." />;
  }

  const hasActive = Boolean(active && active.items.length > 0);

  return (
    <Sheet kicker="Atención en piso" title="Prescripción electrónica (CPOE)" wide>
      <p className="lead">
        Gestione el plan terapéutico
        {encounter ? ` de ${encounter.patientName}` : ""}. Edite, elimine o agregue medicamentos de forma individual.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      {fieldError ? <Feedback tone="error">{fieldError}</Feedback> : null}

      <section className="result-block" aria-label="Prescripción activa">
        <h3>Prescripción activa</h3>
        {!hasActive ? (
          <Feedback tone="info">No hay plan CPOE activo. Cree la primera prescripción abajo.</Feedback>
        ) : (
          <>
            <p className="hint">Firmada: {formatDateTime(active!.signedAt)}. La enfermera administra desde e-MAR del turno.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th>Dosis</th>
                    <th>Vía</th>
                    <th>Frecuencia</th>
                    <th>Código barras</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {active!.items.map((item) => (
                    <tr key={item.id}>
                      {editingId === item.id ? (
                        <td colSpan={6}>
                          <form className="stack" onSubmit={onSaveEdit}>
                            <div className="form-grid">
                              <TextField id="edit-drug" label="Medicamento" value={editForm.drugName} onChange={(e) => setEditForm({ ...editForm, drugName: e.target.value })} required />
                              <TextField id="edit-dose" label="Dosis" value={editForm.dose} onChange={(e) => setEditForm({ ...editForm, dose: e.target.value })} required />
                              <TextField id="edit-route" label="Vía" value={editForm.route} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} required />
                              <TextField id="edit-freq" label="Frecuencia" value={editForm.frequency} onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })} required />
                            </div>
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
                          <td><code>{item.drugBarcode}</code></td>
                          <td className="row-actions">
                            <Button type="button" variant="quiet" onClick={() => { setEditingId(item.id); setEditForm({ drugName: item.drugName, dose: item.dose, route: item.route, frequency: item.frequency }); }}>Editar</Button>
                            <Button type="button" variant="quiet" onClick={() => void onDeleteItem(item.id)}>Eliminar</Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form className="stack" onSubmit={onAddItem} noValidate>
              <h3>Agregar medicamento</h3>
              <div className="form-grid">
                <TextField id="add-drug" label="Medicamento" value={addForm.drugName} onChange={(e) => setAddForm({ ...addForm, drugName: e.target.value })} required />
                <TextField id="add-dose" label="Dosis" value={addForm.dose} onChange={(e) => setAddForm({ ...addForm, dose: e.target.value })} required />
                <TextField id="add-route" label="Vía" value={addForm.route} onChange={(e) => setAddForm({ ...addForm, route: e.target.value })} required />
                <TextField id="add-freq" label="Frecuencia" value={addForm.frequency} onChange={(e) => setAddForm({ ...addForm, frequency: e.target.value })} required />
              </div>
              <FormActions>
                <Button type="submit" disabled={saving}>Agregar al plan</Button>
              </FormActions>
            </form>
          </>
        )}
      </section>

      {!hasActive ? (
        <form className="stack" onSubmit={onCreatePlan} noValidate aria-label="Nueva prescripción">
          <h3>Nueva prescripción</h3>
          {newLines.map((item, index) => (
            <div className="form-grid" key={index}>
              <TextField id={`drug-${index}`} label="Medicamento" value={item.drugName} onChange={(e) => updateNewLine(index, { drugName: e.target.value })} required />
              <TextField id={`dose-${index}`} label="Dosis" value={item.dose} onChange={(e) => updateNewLine(index, { dose: e.target.value })} required />
              <TextField id={`route-${index}`} label="Vía" value={item.route} onChange={(e) => updateNewLine(index, { route: e.target.value })} required placeholder="VO, IV…" />
              <TextField id={`freq-${index}`} label="Frecuencia" value={item.frequency} onChange={(e) => updateNewLine(index, { frequency: e.target.value })} required placeholder="cada 8 horas" />
            </div>
          ))}
          <FormActions>
            <Button type="button" variant="quiet" onClick={() => setNewLines((prev) => [...prev, emptyItem()])}>Agregar línea</Button>
            <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar CPOE"}</Button>
          </FormActions>
        </form>
      ) : null}

      <section className="result-block" aria-label="Kardex electrónico">
        <h3>Kardex electrónico</h3>
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
      </section>
    </Sheet>
  );
}
