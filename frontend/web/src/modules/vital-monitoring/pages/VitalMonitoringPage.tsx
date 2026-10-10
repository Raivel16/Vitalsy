import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import {
  calculateNews2,
  type Consciousness,
  type ConfusionOnset,
  type Spo2Scale,
} from "../../nursing-assessment/domain/news2";
import { validateVitalSigns } from "../../nursing-assessment/domain/vitalSigns";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { BloodPressureField } from "../../../shared/ui/BloodPressureField";
import { SelectField, UnitField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { formatDateTime } from "../../../shared/datetime/format";
import { VitalSignsChart } from "../ui/VitalSignsChart";
import type { ChartPoint } from "../ui/types";

const emptyFields = {
  respiratoryRate: "",
  oxygenSaturation: "",
  systolicBloodPressure: "",
  diastolicBloodPressure: "",
  pulse: "",
  temperature: "",
};

export function VitalMonitoringPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [fields, setFields] = useState(emptyFields);
  const [spo2Scale, setSpo2Scale] = useState<Spo2Scale>("scale1");
  const [supplementalOxygen, setSupplementalOxygen] = useState(false);
  const [consciousness, setConsciousness] = useState<Consciousness>("alert");
  const [confusionOnset, setConfusionOnset] = useState<ConfusionOnset>("new");
  const [submitted, setSubmitted] = useState(false);
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [news2Label, setNews2Label] = useState("");
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

  function loadChart() {
    if (!ingreso) return;
    api<{ series: ChartPoint[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/vital-signs/chart`)
      .then((data) => setSeries(data.series))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadChart();
  }, [ingreso]);

  function update(key: keyof typeof emptyFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
    setSubmitted(true);
    if (!ready || !preview) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{
        reading: { news2: { total: number; band?: string; label?: string } };
        alertActivated: boolean;
        nextControlAt: string | null;
      }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/vital-signs`, {
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
      });
      const total = data.reading.news2.total;
      setNews2Label(`NEWS2 ${total}`);
      if (data.alertActivated) {
        setNotice(`Se activó el proceso de alertas (NEWS2 ${total}).`);
      } else {
        setNotice(`NEWS2 0. Próximo control: ${formatDateTime(data.nextControlAt)}.`);
      }
      setFields(emptyFields);
      setSubmitted(false);
      setSupplementalOxygen(false);
      setConsciousness("alert");
      setSpo2Scale("scale1");
      loadChart();
    } catch (caught) {
      setError(errorText(caught, "No se pudieron registrar las constantes."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return (
      <Sheet kicker="Monitoreo fisiológico" title="Monitoreo de constantes" wide clinic="file" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado para registrar constantes." />
      </Sheet>
    );
  }

  const visibleErrors = submitted ? liveErrors : {};
  const urgent = Boolean(preview?.singleParameterAlert || preview?.band === "high");

  return (
    <Sheet kicker="Monitoreo fisiológico" title="Monitoreo de constantes" wide clinic="file" className="floor-care">
      <p className="lead">
        Capture constantes
        {encounter ? ` de ${encounter.patientName}` : ""}. El sistema calcula NEWS2, programa controles y activa alertas.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      {news2Label ? <p role="status" className={`news news-${news2Label.includes(" 0") ? "green" : "yellow"}`}>{news2Label}</p> : null}
      <form className="stack clinical-panel" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <UnitField id="rr" label="Frecuencia respiratoria" unit="rpm" abbr="FR" inputMode="numeric" value={fields.respiratoryRate} onChange={(e) => update("respiratoryRate", e.target.value)} error={visibleErrors.respiratoryRate} />
          <UnitField id="spo2" label="Saturación" unit="%" abbr="SpO2" inputMode="numeric" value={fields.oxygenSaturation} onChange={(e) => update("oxygenSaturation", e.target.value)} error={visibleErrors.oxygenSaturation} />
          <BloodPressureField
            systolic={fields.systolicBloodPressure}
            diastolic={fields.diastolicBloodPressure}
            onSystolic={(value) => update("systolicBloodPressure", value)}
            onDiastolic={(value) => update("diastolicBloodPressure", value)}
            systolicError={visibleErrors.systolicBloodPressure}
            diastolicError={visibleErrors.diastolicBloodPressure}
          />
          <UnitField id="pulse" label="Pulso" unit="lpm" abbr="FC" inputMode="numeric" value={fields.pulse} onChange={(e) => update("pulse", e.target.value)} error={visibleErrors.pulse} />
          <UnitField id="temperature" label="Temperatura" unit="°C" abbr="Temp" inputMode="decimal" value={fields.temperature} onChange={(e) => update("temperature", e.target.value)} error={visibleErrors.temperature} />
        </div>
        <SelectField id="spo2-scale" label="Escala de SpO2" value={spo2Scale} onChange={(e) => setSpo2Scale(e.target.value as Spo2Scale)} hint="Escala 2 solo si un clínico indicó objetivo 88-92 %.">
          <option value="scale1">Escala 1</option>
          <option value="scale2">Escala 2 · objetivo 88-92 %</option>
        </SelectField>
        <label className="check">
          <input type="checkbox" checked={supplementalOxygen} onChange={(e) => setSupplementalOxygen(e.target.checked)} />
          {" "}
          Oxígeno suplementario
        </label>
        <SelectField id="consciousness" label="Conciencia" value={consciousness} onChange={(e) => setConsciousness(e.target.value as Consciousness)}>
          <option value="alert">Alerta</option>
          <option value="confusion">Confusión</option>
          <option value="voice">Responde a la voz</option>
          <option value="pain">Responde al dolor</option>
          <option value="unresponsive">No responde</option>
        </SelectField>
        {consciousness === "confusion" ? (
          <SelectField id="confusion-onset" label="Inicio de la confusión" value={confusionOnset} onChange={(e) => setConfusionOnset(e.target.value as ConfusionOnset)}>
            <option value="new">Nueva</option>
            <option value="chronic">Crónica, ya conocida</option>
          </SelectField>
        ) : null}
        {preview ? (
          <div className={`news news-${preview.visual} vitals-live`} role={urgent ? "alert" : "status"} aria-label={urgent ? undefined : "Resultado NEWS2"}>
            <strong>{preview.total} puntos. {preview.visualLabel}.</strong>
            <span>{preview.clinicalResponse}</span>
          </div>
        ) : null}
        <FormActions>
          <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar constantes"}</Button>
        </FormActions>
      </form>
      <section className="result-block" aria-label="Gráfica evolutiva">
        <h3>Gráfica evolutiva</h3>
        {series.length === 0 ? (
          <Feedback tone="info">Aún no hay lecturas para graficar.</Feedback>
        ) : (
          <>
            <VitalSignsChart series={series} />
            <div className="table-wrap">
              <table>
                <caption>Historial reciente</caption>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Pulso</th>
                    <th>FR</th>
                    <th>SpO₂</th>
                    <th>NEWS2</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((point, index) => (
                    <tr key={index}>
                      <td>{formatDateTime(point.recordedAt)}</td>
                      <td>{point.pulse ?? "—"}</td>
                      <td>{point.respiratoryRate ?? "—"}</td>
                      <td>{point.oxygenSaturation ?? "—"}</td>
                      <td>{point.news2 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </Sheet>
  );
}
