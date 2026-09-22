import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextField, SelectField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";

type ChartPoint = {
  recordedAt: string | null;
  pulse: number | null;
  news2: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
};

export function VitalMonitoringPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [form, setForm] = useState({
    respiratoryRate: "16",
    oxygenSaturation: "98",
    systolicBloodPressure: "120",
    pulse: "72",
    temperature: "36.8",
    consciousness: "alert",
  });
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [news2Label, setNews2Label] = useState("");
  const [saving, setSaving] = useState(false);

  function loadChart() {
    if (!ingreso) return;
    api<{ series: ChartPoint[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/vital-signs/chart`)
      .then((data) => setSeries(data.series))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadChart();
  }, [ingreso]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ingreso) return;
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
          respiratoryRate: Number(form.respiratoryRate),
          oxygenSaturation: Number(form.oxygenSaturation),
          systolicBloodPressure: Number(form.systolicBloodPressure),
          pulse: Number(form.pulse),
          temperature: Number(form.temperature),
          consciousness: form.consciousness,
          supplementalOxygen: false,
          spo2Scale: "scale1",
        }),
      });
      const total = data.reading.news2.total;
      setNews2Label(`NEWS2 ${total}`);
      if (data.alertActivated) {
        setNotice(`Se activó el proceso de alertas (NEWS2 ${total}).`);
      } else {
        setNotice(`NEWS2 0. Próximo control: ${data.nextControlAt ?? "en 12 horas"}.`);
      }
      loadChart();
    } catch (caught) {
      setError(errorText(caught, "No se pudieron registrar las constantes."));
    } finally {
      setSaving(false);
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado para registrar constantes." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="Monitoreo de constantes" wide>
      <p className="lead">
        Capture constantes
        {encounter ? ` de ${encounter.patientName}` : ""}. El sistema calcula NEWS2, programa controles y activa alertas.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del registro">{notice}</Feedback> : null}
      {news2Label ? <p role="status" className={`news news-${news2Label.includes("0") ? "low" : "medium"}`}>{news2Label}</p> : null}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="rr" label="Frecuencia respiratoria" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} required />
        <TextField id="spo2" label="SatO₂ %" value={form.oxygenSaturation} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} required />
        <TextField id="sbp" label="Presión sistólica" value={form.systolicBloodPressure} onChange={(e) => setForm({ ...form, systolicBloodPressure: e.target.value })} required />
        <TextField id="pulse" label="Pulso" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} required />
        <TextField id="temp" label="Temperatura °C" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} required />
        <SelectField id="avpu" label="Consciencia" value={form.consciousness} onChange={(e) => setForm({ ...form, consciousness: e.target.value })}>
          <option value="alert">Alerta</option>
          <option value="voice">Responde a voz</option>
          <option value="pain">Responde al dolor</option>
          <option value="unresponsive">No responde</option>
        </SelectField>
        <FormActions>
          <Button type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar constantes"}</Button>
        </FormActions>
      </form>
      <section className="result-block" aria-label="Gráfica evolutiva">
        <h3>Gráfica evolutiva</h3>
        {series.length === 0 ? (
          <Feedback tone="info">Aún no hay lecturas para graficar.</Feedback>
        ) : (
          <ul>
            {series.map((point, index) => (
              <li key={index}>
                {point.recordedAt}: pulso {point.pulse}, FR {point.respiratoryRate}, SpO₂ {point.oxygenSaturation}, NEWS2 {point.news2}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Sheet>
  );
}
