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

type Item = { drugName: string; dose: string; route: string; frequency: string };

const emptyItem = (): Item => ({ drugName: "", dose: "", route: "VO", frequency: "" });

export function CpoePage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [continuePlan, setContinuePlan] = useState(false);
  const [kardexMeds, setKardexMeds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    api<{ medications: string[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/kardex`)
      .then((data) => {
        if (active) setKardexMeds(data.medications);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [ingreso]);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    const cleaned = items
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
      const data = await api<{ prescription: { items: Item[] }; kardex: { medications: string[] } }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/prescriptions`,
        { method: "POST", body: JSON.stringify({ continuePlan, items: cleaned }) },
      );
      setKardexMeds(data.kardex.medications);
      setItems([emptyItem()]);
      setNotice("Prescripción CPOE registrada y Kardex actualizado.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la prescripción."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado para gestionar la prescripción CPOE." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Prescripción electrónica (CPOE)">
      <p className="lead">
        Modifique o continúe el plan terapéutico
        {encounter ? ` de ${encounter.patientName}` : ""}. El Kardex se actualiza automáticamente.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      {fieldError ? <Feedback tone="error">{fieldError}</Feedback> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <label className="check">
          <input type="checkbox" checked={continuePlan} onChange={(event) => setContinuePlan(event.target.checked)} />
          Continuar plan activo e incluir los nuevos ítems
        </label>
        {items.map((item, index) => (
          <div className="stack" key={index}>
            <TextField id={`drug-${index}`} label="Medicamento" value={item.drugName} onChange={(e) => updateItem(index, { drugName: e.target.value })} required />
            <TextField id={`dose-${index}`} label="Dosis" value={item.dose} onChange={(e) => updateItem(index, { dose: e.target.value })} required />
            <TextField id={`route-${index}`} label="Vía" value={item.route} onChange={(e) => updateItem(index, { route: e.target.value })} required />
            <TextField id={`freq-${index}`} label="Frecuencia" value={item.frequency} onChange={(e) => updateItem(index, { frequency: e.target.value })} required />
          </div>
        ))}
        <FormActions>
          <Button type="button" variant="quiet" onClick={() => setItems((prev) => [...prev, emptyItem()])}>Agregar línea</Button>
          <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar CPOE"}</Button>
        </FormActions>
      </form>
      <section className="result-block" aria-label="Kardex electrónico">
        <h3>Kardex electrónico</h3>
        {kardexMeds.length === 0 ? (
          <Feedback tone="info">Sin medicamentos CPOE activos.</Feedback>
        ) : (
          <ul>{kardexMeds.map((med) => <li key={med}>{med}</li>)}</ul>
        )}
      </section>
    </Sheet>
  );
}
