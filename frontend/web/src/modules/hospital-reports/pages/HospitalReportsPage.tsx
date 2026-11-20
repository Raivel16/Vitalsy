import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { StatTile } from "../../../shared/ui/clinical";
import { HorizontalBarChart } from "../../clinical-alerts/components/ReportCharts";
import { formatMinutes, formatPercent, type ReportFilterErrors } from "../../clinical-alerts/domain/report";
import { FlowChart } from "../components/FlowChart";
import {
  buildHospitalQuery,
  defaultHospitalFilters,
  formatHours,
  validateHospitalFilters,
  type HospitalFilters,
  type HospitalReport,
} from "../domain/indicators";

type Notice = { tone: "success" | "error"; text: string } | null;

/** RF-115: tablero de indicadores del hospital para jefatura, supervisión y gestión de camas. */
export function HospitalReportsPage() {
  const [filters, setFilters] = useState<HospitalFilters>(() => defaultHospitalFilters());
  const [errors, setErrors] = useState<ReportFilterErrors>({});
  const [report, setReport] = useState<HospitalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async (next: HospitalFilters, announce: boolean) => {
    try {
      const data = await api<HospitalReport>(`/api/v1/reports/hospital?${buildHospitalQuery(next)}`);
      setReport(data);
      // La carga inicial es silenciosa: no reemplaza un aviso de validación mostrado mientras terminaba.
      if (announce) {
        setNotice({ tone: "success", text: `Indicadores actualizados: ${data.flow.admissions} ingresos y ${data.flow.discharges} altas en el período.` });
      }
    } catch (error) {
      setReport(null);
      setNotice({ tone: "error", text: errorText(error, "No se pudo obtener el tablero de indicadores.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(defaultHospitalFilters(), false);
  }, [load]);

  function update(key: keyof HospitalFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const found = validateHospitalFilters(filters);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ tone: "error", text: "Revise los filtros antes de consultar." });
      return;
    }
    setLoading(true);
    void load(filters, true);
  }

  return (
    <Sheet kicker="Reportes" title="Indicadores hospitalarios" wide clinic="board" className="floor-care ops-board">
      <p className="lead">
        Ocupación de camas, flujo de ingresos y altas, recambio de camas y cumplimiento del plazo de acuse de alertas, calculados con los registros del hospital.
      </p>

      <form className="panel report-filters" onSubmit={submit} noValidate aria-label="Filtros del tablero">
        <TextField id="hospital-from" label="Desde" type="date" value={filters.from} error={errors.from} onChange={(e) => update("from", e.target.value)} />
        <TextField id="hospital-to" label="Hasta" type="date" value={filters.to} error={errors.to} onChange={(e) => update("to", e.target.value)} />
        <SelectField id="hospital-ward" label="Sala" value={filters.ward} onChange={(e) => update("ward", e.target.value)}>
          <option value="">Todas</option>
          {(report?.options.wards ?? []).map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
        </SelectField>
        <div className="report-filters-actions">
          <Button type="submit" pending={loading}>Consultar indicadores</Button>
        </div>
      </form>

      {notice ? <Feedback tone={notice.tone}>{notice.text}</Feedback> : null}
      {loading && !report ? <LoadingState label="Calculando indicadores…" /> : null}
      {report ? <ReportBody report={report} /> : null}
    </Sheet>
  );
}

function ReportBody({ report }: Readonly<{ report: HospitalReport }>) {
  const { beds, flow, turnover, alerts } = report;
  const nurse = alerts.nurseAcknowledgement;

  return (
    <>
      <section className="stat-grid" aria-label="Indicadores principales">
        <StatTile label="Ocupación de camas" value={formatPercent(beds.occupancyPercent)} hint={`${beds.occupied} de ${beds.total} camas ocupadas`} tone="info" />
        <StatTile label="Ingresos del período" value={flow.admissions} hint={`${flow.discharges} altas efectivas`} />
        <StatTile label="Estancia promedio" value={formatHours(flow.averageStayHours)} hint="Desde el ingreso hasta la salida efectiva" tone="info" />
        <StatTile label="Recambio de cama (promedio)" value={formatMinutes(turnover.averageMinutes)} hint={`${turnover.completed} completados · ${turnover.pending} pendientes`} tone="warning" />
        <StatTile label="Acuses dentro del plazo" value={formatPercent(nurse.withinTargetPercent)} hint={`Meta ≤ ${nurse.targetMinutes} min · ${nurse.measured} acuses medidos`} tone="success" />
        <StatTile label="Alertas generadas" value={alerts.totalAlerts} hint={`${alerts.activeAlerts} activas`} tone="danger" />
      </section>

      <div className="report-grid">
        <section className="panel">
          <HorizontalBarChart
            title="Ocupación por sala (%)"
            data={beds.byWard.map((ward) => ({ label: `${ward.name} (${ward.occupied}/${ward.total})`, value: ward.occupancyPercent ?? 0, tone: "warning" }))}
          />
        </section>
        <section className="panel">
          <HorizontalBarChart
            title="Estado de las camas"
            data={[
              { label: "Ocupadas", value: beds.occupied, tone: "danger" },
              { label: "Disponibles", value: beds.available, tone: "info" },
              { label: "En limpieza", value: beds.cleaning, tone: "warning" },
              { label: "Bloqueadas", value: beds.blocked, tone: "neutral" },
            ]}
          />
        </section>
        <section className="panel"><FlowChart rows={flow.daily} /></section>
      </div>

      <div className="table-wrap">
        <table aria-label="Detalle diario de ingresos y altas">
          <caption>Detalle diario ({report.period.from} a {report.period.to})</caption>
          <thead>
            <tr><th scope="col">Fecha</th><th scope="col">Ingresos</th><th scope="col">Altas</th></tr>
          </thead>
          <tbody>
            {flow.daily.map((row) => (
              <tr key={row.date}><td>{row.date}</td><td>{row.admissions}</td><td>{row.discharges}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
