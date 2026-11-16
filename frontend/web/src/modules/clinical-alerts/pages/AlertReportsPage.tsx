import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { StatTile } from "../../../shared/ui/clinical";
import { DailyAlertsChart, HorizontalBarChart, type BarDatum } from "../components/ReportCharts";
import {
  SEVERITY_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  buildReportQuery,
  defaultReportFilters,
  formatMinutes,
  formatPercent,
  labelFor,
  validateReportFilters,
  type AlertReport,
  type ReportFilterErrors,
  type ReportFilters,
} from "../domain/report";

const SEVERITY_TONE: Record<string, BarDatum["tone"]> = { alta: "danger", media: "warning", baja: "info" };

type Notice = { tone: "success" | "error"; text: string } | null;

/** RF-114: indicadores de monitoreo y respuesta a alertas para la supervisión de enfermería. */
export function AlertReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => defaultReportFilters());
  const [errors, setErrors] = useState<ReportFilterErrors>({});
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async (next: ReportFilters, announce: boolean) => {
    try {
      const data = await api<AlertReport>(`/api/v1/clinical-alerts/reports?${buildReportQuery(next)}`);
      setReport(data);
      // La carga inicial es silenciosa: no reemplaza un aviso de validación mostrado mientras terminaba.
      if (announce) setNotice({ tone: "success", text: `Reporte actualizado: ${data.summary.totalAlerts} alertas en el período.` });
    } catch (error) {
      setReport(null);
      setNotice({ tone: "error", text: errorText(error, "No se pudo obtener el reporte de alertas.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(defaultReportFilters(), false);
  }, [load]);

  function update(key: keyof ReportFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateReportFilters(filters);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ tone: "error", text: "Revise los filtros antes de consultar." });
      return;
    }
    setLoading(true);
    void load(filters, true);
  }

  return (
    <Sheet kicker="Alertas clínicas" title="Reportes de monitoreo y alertas" wide clinic="board" className="floor-care ops-board">
      <p className="lead">
        Indicadores calculados con las alertas registradas: oportunidad del acuse, escalamientos y respuesta médica.
      </p>

      <form className="panel report-filters" onSubmit={submit} noValidate aria-label="Filtros del reporte">
        <TextField id="report-from" label="Desde" type="date" value={filters.from} error={errors.from} onChange={(e) => update("from", e.target.value)} />
        <TextField id="report-to" label="Hasta" type="date" value={filters.to} error={errors.to} onChange={(e) => update("to", e.target.value)} />
        <SelectField id="report-severity" label="Severidad" value={filters.severity} onChange={(e) => update("severity", e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(SEVERITY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </SelectField>
        <SelectField id="report-source" label="Origen" value={filters.source} onChange={(e) => update("source", e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(SOURCE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </SelectField>
        <SelectField id="report-service" label="Servicio" value={filters.service} onChange={(e) => update("service", e.target.value)}>
          <option value="">Todos</option>
          {(report?.options.services ?? []).map((service) => <option key={service} value={service}>{service}</option>)}
        </SelectField>
        <div className="report-filters-actions">
          <Button type="submit" pending={loading}>Consultar reporte</Button>
        </div>
      </form>

      {notice ? <Feedback tone={notice.tone}>{notice.text}</Feedback> : null}
      {loading && !report ? <LoadingState label="Calculando indicadores…" /> : null}
      {report ? <ReportBody report={report} /> : null}
    </Sheet>
  );
}

function ReportBody({ report }: Readonly<{ report: AlertReport }>) {
  const { summary, nurseAcknowledgement: nurse, escalation, medicalResponse: medical } = report;

  return (
    <>
      <section className="stat-grid" aria-label="Indicadores principales">
        <StatTile label="Alertas generadas" value={summary.totalAlerts} hint={`${summary.activeAlerts} activas · ${summary.closedAlerts} cerradas`} />
        <StatTile label="Acuse de enfermería (promedio)" value={formatMinutes(nurse.averageMinutes)} hint={`Meta ≤ ${nurse.targetMinutes} min · ${nurse.pending} sin acuse`} tone="info" />
        <StatTile label="Acuses dentro del plazo" value={formatPercent(nurse.withinTargetPercent)} hint={`${nurse.measured} acuses medidos`} tone="success" />
        <StatTile label="Tasa de escalamiento" value={formatPercent(escalation.ratePercent)} hint={`${escalation.toSupervisor} a supervisora · ${escalation.toRapidResponse} al ERR`} tone="warning" />
        <StatTile label="Respuesta médica (promedio)" value={formatMinutes(medical.averageMinutes)} hint={`Meta ≤ ${medical.targetMinutes} min · ${formatPercent(medical.withinTargetPercent)} en plazo`} tone="info" />
        <StatTile label="Traslados a UCI" value={summary.icuTransfers} hint={`${medical.notified} alertas con médico notificado`} tone="danger" />
      </section>

      <div className="report-grid">
        <section className="panel"><DailyAlertsChart rows={report.daily} /></section>
        <section className="panel">
          <HorizontalBarChart
            title="Alertas por severidad"
            data={report.bySeverity.map((item) => ({ label: labelFor(SEVERITY_LABEL, item.key), value: item.count, tone: SEVERITY_TONE[item.key] }))}
          />
        </section>
        <section className="panel">
          <HorizontalBarChart
            title="Alertas por origen"
            data={report.bySource.map((item) => ({ label: labelFor(SOURCE_LABEL, item.key), value: item.count }))}
          />
        </section>
        <section className="panel">
          <HorizontalBarChart
            title="Distribución NEWS2"
            data={report.news2Distribution.map((item) => ({ label: `NEWS2 ${item.band}`, value: item.count, tone: item.band === "7+" ? "danger" : "info" }))}
          />
        </section>
        <section className="panel">
          <HorizontalBarChart
            title="Alertas por estado"
            data={report.byStatus.map((item) => ({ label: labelFor(STATUS_LABEL, item.key), value: item.count, tone: "neutral" }))}
          />
        </section>
      </div>

      <div className="table-wrap">
        <table aria-label="Detalle diario de alertas">
          <caption>Detalle diario ({report.period.from} a {report.period.to})</caption>
          <thead>
            <tr><th scope="col">Fecha</th><th scope="col">Total</th><th scope="col">Alta</th><th scope="col">Media</th><th scope="col">Baja</th></tr>
          </thead>
          <tbody>
            {report.daily.map((row) => (
              <tr key={row.date}><td>{row.date}</td><td>{row.total}</td><td>{row.alta}</td><td>{row.media}</td><td>{row.baja}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
