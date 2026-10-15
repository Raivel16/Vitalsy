import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import {
  calculateNews2,
  type Consciousness,
  type ConfusionOnset,
  type Spo2Scale,
} from "../../nursing-assessment/domain/news2";
import { validateVitalSigns } from "../../nursing-assessment/domain/vitalSigns";
import { Button } from "../../../shared/ui/Button";
import { BloodPressureField } from "../../../shared/ui/BloodPressureField";
import { SelectField, UnitField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { formatDateTime } from "../../../shared/datetime/format";

type ControlRow = {
  encounterId: string;
  patientName: string;
  location: string | null;
  nextDueAt: string | null;
  frequencyMinutes: number;
  overdue: boolean;
  assignedNurseId: number | null;
};

const emptyFields = {
  respiratoryRate: "",
  oxygenSaturation: "",
  systolicBloodPressure: "",
  diastolicBloodPressure: "",
  pulse: "",
  temperature: "",
};

export function VitalControlsPage() {
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [selected, setSelected] = useState<ControlRow | null>(null);
  const [fields, setFields] = useState(emptyFields);
  const [spo2Scale, setSpo2Scale] = useState<Spo2Scale>("scale1");
  const [supplementalOxygen, setSupplementalOxygen] = useState(false);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [confusionOnset, setConfusionOnset] = useState<ConfusionOnset>("new");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const liveErrors = validateVitalSigns(fields);
  const ready = Object.keys(liveErrors).length === 0;
  const preview = useMemo(() => {
    if (!ready) return null;
    return calculateNews2({
      respiratoryRate: Number(fields.respiratoryRate),
      oxygenSaturation: Number(fields.oxygenSaturation),
      spo2Scale,
      supplementalOxygen,
      systolicBloodPressure: Number(fields.systolicBloodPressure),
      pulse: Number(fields.pulse),
      consciousness,
      confusionOnset,
      temperature: Number(fields.temperature.replace(",", ".")),
    });
  }, [consciousness, confusionOnset, fields, ready, spo2Scale, supplementalOxygen]);

  function load() {
    api<{ controls: ControlRow[] }>("/api/v1/inpatient-care/monitoring-controls")
      .then((data) => setControls(data.controls))
      .catch((error_) => setError(errorText(error_, "No se pudo cargar la bandeja de controles.")));
  }

  useEffect(() => {
    load();
  }, []);

  function update(key: keyof typeof emptyFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setFields(emptyFields);
    setSubmitted(false);
    setSupplementalOxygen(false);
    setConsciousness("alert");
    setSpo2Scale("scale1");
    setConfusionOnset("new");
  }

  async function onComplete(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSubmitted(true);
    if (!ready || !preview) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{
        reading: { news2: { total: number } };
        alertActivated: boolean;
        nextControlAt: string | null;
      }>(
        `/api/v1/inpatient-care/encounters/${encodeURIComponent(selected.encounterId)}/monitoring-controls/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            respiratoryRate: Number(fields.respiratoryRate),
            oxygenSaturation: Number(fields.oxygenSaturation),
            systolicBloodPressure: Number(fields.systolicBloodPressure),
            diastolicBloodPressure: Number(fields.diastolicBloodPressure),
            pulse: Number(fields.pulse),
            temperature: Number(fields.temperature.replace(",", ".")),
            consciousness,
            confusionOnset,
            supplementalOxygen,
            spo2Scale,
          }),
        },
      );
      const total = data.reading.news2.total;
      if (data.alertActivated) {
        setNotice(`Control registrado. NEWS2 ${total}: se activó el proceso de alertas.`);
      } else {
        setNotice(`Control registrado. Próximo control: ${formatDateTime(data.nextControlAt)}.`);
      }
      setSelected(null);
      resetForm();
      load();
    } catch (error_) {
      setError(errorText(error_, "No se pudo registrar el control."));
    } finally {
      setSaving(false);
    }
  }

  const visibleErrors = submitted ? liveErrors : {};

  return (
    <Sheet kicker="Cumplimiento del turno" title="Controles de constantes" wide clinic="file" className="floor-care">
      <p className="lead">
        Controles programados del turno (vencidos y próximos). Registre la toma para avanzar el plan, igual que el e-MAR con las dosis.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del control">{notice}</Feedback> : null}

      {controls.length === 0 ? (
        <Feedback tone="info">No hay controles vencidos ni próximos en la ventana del turno.</Feedback>
      ) : (
        <div className="table-wrap" aria-label="Controles programados">
          <table>
            <thead>
              <tr>
                <th>Vence</th>
                <th>Paciente</th>
                <th>Ubicación</th>
                <th>Frecuencia</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {controls.map((row) => (
                <tr key={row.encounterId} className={selected?.encounterId === row.encounterId ? "is-selected" : undefined}>
                  <td>{formatDateTime(row.nextDueAt)}</td>
                  <td>{row.patientName}</td>
                  <td>{row.location ?? "—"}</td>
                  <td>cada {row.frequencyMinutes} min</td>
                  <td>{row.overdue ? "Vencido" : "Próximo"}</td>
                  <td>
                    <Button
                      type="button"
                      variant={selected?.encounterId === row.encounterId ? "primary" : "quiet"}
                      onClick={() => {
                        setSelected(row);
                        setError("");
                        setNotice("");
                        resetForm();
                      }}
                    >
                      Registrar control
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <form className="stack result-block clinical-panel" onSubmit={onComplete} noValidate aria-label="Formulario de control">
          <h3>
            Control de {selected.patientName}
            {" · "}
            <Link to={`/atencion/constantes?ingreso=${encodeURIComponent(selected.encounterId)}`}>
              Ver constantes
            </Link>
          </h3>
          <div className="form-grid">
            <UnitField
              id="ctrl-rr"
              label="Frecuencia respiratoria"
              unit="rpm"
              abbr="FR"
              inputMode="numeric"
              value={fields.respiratoryRate}
              onChange={(e) => update("respiratoryRate", e.target.value)}
              error={visibleErrors.respiratoryRate}
            />
            <UnitField
              id="ctrl-spo2"
              label="Saturación"
              unit="%"
              abbr="SpO2"
              inputMode="numeric"
              value={fields.oxygenSaturation}
              onChange={(e) => update("oxygenSaturation", e.target.value)}
              error={visibleErrors.oxygenSaturation}
            />
            <BloodPressureField
              systolicId="ctrl-sbp"
              diastolicId="ctrl-dbp"
              systolic={fields.systolicBloodPressure}
              diastolic={fields.diastolicBloodPressure}
              onSystolic={(value) => update("systolicBloodPressure", value)}
              onDiastolic={(value) => update("diastolicBloodPressure", value)}
              systolicError={visibleErrors.systolicBloodPressure}
              diastolicError={visibleErrors.diastolicBloodPressure}
            />
            <UnitField
              id="ctrl-pulse"
              label="Pulso"
              unit="lpm"
              abbr="FC"
              inputMode="numeric"
              value={fields.pulse}
              onChange={(e) => update("pulse", e.target.value)}
              error={visibleErrors.pulse}
            />
            <UnitField
              id="ctrl-temperature"
              label="Temperatura"
              unit="°C"
              abbr="Temp"
              inputMode="decimal"
              value={fields.temperature}
              onChange={(e) => update("temperature", e.target.value)}
              error={visibleErrors.temperature}
            />
          </div>
          <SelectField
            id="ctrl-spo2-scale"
            label="Escala de SpO2"
            value={spo2Scale}
            onChange={(e) => setSpo2Scale(e.target.value as Spo2Scale)}
          >
            <option value="scale1">Escala 1</option>
            <option value="scale2">Escala 2 · objetivo 88-92 %</option>
          </SelectField>
          <label className="check">
            <input
              type="checkbox"
              checked={supplementalOxygen}
              onChange={(e) => setSupplementalOxygen(e.target.checked)}
            />
            {" "}
            Oxígeno suplementario
          </label>
          <SelectField
            id="ctrl-consciousness"
            label="Conciencia"
            value={consciousness}
            onChange={(e) => setConsciousness(e.target.value as Consciousness)}
          >
            <option value="alert">Alerta</option>
            <option value="confusion">Confusión</option>
            <option value="voice">Responde a la voz</option>
            <option value="pain">Responde al dolor</option>
            <option value="unresponsive">No responde</option>
          </SelectField>
          {consciousness === "confusion" ? (
            <SelectField
              id="ctrl-confusion-onset"
              label="Inicio de la confusión"
              value={confusionOnset}
              onChange={(e) => setConfusionOnset(e.target.value as ConfusionOnset)}
            >
              <option value="new">Nueva</option>
              <option value="chronic">Crónica, ya conocida</option>
            </SelectField>
          ) : null}
          {preview ? (
            <p role="status" className={`news news-${preview.visual}`}>
              Vista previa NEWS2: {preview.total} · {preview.visualLabel}
            </p>
          ) : null}
          <FormActions>
            <Button type="button" variant="quiet" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Registrando…" : "Confirmar control"}
            </Button>
          </FormActions>
        </form>
      ) : null}
    </Sheet>
  );
}
