import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import {
  REPORT_MAX_DAYS,
  buildReportQuery,
  defaultReportFilters,
  formatMinutes,
  formatPercent,
  validateReportFilters,
  type AlertReport,
} from "./domain/report";

const REPORTS_PATH = "/alertas/reportes";
const REPORTS_API = "/api/v1/clinical-alerts/reports?";
const CONSULT = /consultar reporte/i;

const report: AlertReport = {
  period: { from: "2026-11-03", to: "2026-11-09" },
  filters: { severity: null, source: null, service: null },
  options: { services: ["Cirugia", "Medicina"] },
  summary: { totalAlerts: 4, closedAlerts: 2, activeAlerts: 2, icuTransfers: 1 },
  nurseAcknowledgement: { targetMinutes: 5, measured: 3, pending: 1, averageMinutes: 5.3, withinTargetPercent: 66.7 },
  escalation: { escalatedAlerts: 2, ratePercent: 50, toSupervisor: 1, toRapidResponse: 1 },
  medicalResponse: { targetMinutes: 15, notified: 2, measured: 2, averageMinutes: 15, withinTargetPercent: 50 },
  bySeverity: [
    { key: "alta", count: 2 },
    { key: "media", count: 2 },
    { key: "baja", count: 0 },
  ],
  bySource: [
    { key: "news2", count: 3 },
    { key: "observacion", count: 1 },
    { key: "control", count: 0 },
    { key: "emar", count: 0 },
  ],
  byStatus: [
    { key: "abierta", count: 1 },
    { key: "cerrada", count: 2 },
    { key: "medico_en_atencion", count: 1 },
  ],
  news2Distribution: [
    { band: "0", count: 0 },
    { band: "1-4", count: 1 },
    { band: "5-6", count: 1 },
    { band: "7+", count: 1 },
  ],
  daily: [
    { date: "2026-11-05", total: 1, alta: 0, media: 1, baja: 0 },
    { date: "2026-11-06", total: 1, alta: 1, media: 0, baja: 0 },
  ],
};

function stubReports(respond: (url: string) => unknown = () => jsonResponse(200, report)) {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes(REPORTS_API)) {
        urls.push(url);
        return respond(url);
      }
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      return jsonResponse(200, {});
    }),
  );
  return urls;
}

describe("dominio del reporte de alertas (RF-114)", () => {
  it("propone los últimos siete días como período por defecto", () => {
    expect(defaultReportFilters(new Date(2026, 10, 9))).toEqual({
      from: "2026-11-03",
      to: "2026-11-09",
      severity: "",
      source: "",
      service: "",
    });
  });

  it("valida fechas obligatorias, orden y período máximo", () => {
    const base = defaultReportFilters(new Date(2026, 10, 9));
    expect(validateReportFilters(base)).toEqual({});
    expect(validateReportFilters({ ...base, from: "" })).toEqual({ from: "Indique la fecha inicial." });
    expect(validateReportFilters({ ...base, to: "" })).toEqual({ to: "Indique la fecha final." });
    expect(validateReportFilters({ ...base, from: "2026-11-10" })).toEqual({
      to: "La fecha final no puede ser anterior a la inicial.",
    });
    expect(validateReportFilters({ ...base, from: "2026-01-01" })).toEqual({
      from: `El período no puede superar ${REPORT_MAX_DAYS} días.`,
    });
  });

  it("arma la consulta solo con los filtros elegidos", () => {
    const base = defaultReportFilters(new Date(2026, 10, 9));
    expect(buildReportQuery(base)).toBe("from=2026-11-03&to=2026-11-09");
    expect(buildReportQuery({ ...base, severity: "alta", service: "Medicina" })).toBe(
      "from=2026-11-03&to=2026-11-09&severity=alta&service=Medicina",
    );
  });

  it("formatea minutos y porcentajes sin datos como guion", () => {
    expect(formatMinutes(5.3)).toBe("5.3 min");
    expect(formatMinutes(null)).toBe("—");
    expect(formatPercent(66.7)).toBe("66.7 %");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("pantalla de reportes de alertas (RF-114)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("muestra los indicadores y gráficos calculados por la API", async () => {
    const urls = stubReports();
    renderApp(REPORTS_PATH, { role: "enfermera_supervisora" });

    const kpis = await screen.findByRole("region", { name: /indicadores principales/i });
    expect(within(kpis).getByText("Alertas generadas")).toBeInTheDocument();
    expect(within(kpis).getByText("5.3 min")).toBeInTheDocument();
    expect(within(kpis).getByText("66.7 %")).toBeInTheDocument();
    expect(within(kpis).getByText("50 %")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /alertas por día/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /alertas por severidad/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /distribución news2/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /detalle diario/i })).toHaveTextContent("2026-11-06");
    expect(urls[0]).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByRole("option", { name: "Cirugia" })).toBeInTheDocument();
  });

  it("consulta con los filtros elegidos y confirma la actualización", async () => {
    const urls = stubReports();
    renderApp(REPORTS_PATH, { role: "jefatura_enfermeria" });
    await screen.findByRole("region", { name: /indicadores principales/i });

    await userEvent.selectOptions(screen.getByLabelText("Severidad"), "alta");
    await userEvent.selectOptions(screen.getByLabelText("Origen"), "observacion");
    await userEvent.click(screen.getByRole("button", { name: CONSULT }));

    expect(await screen.findByText(/reporte actualizado: 4 alertas/i)).toBeInTheDocument();
    expect(urls.at(-1)).toContain("severity=alta&source=observacion");
  });

  it("no consulta la API si el rango de fechas es inválido", async () => {
    const urls = stubReports();
    renderApp(REPORTS_PATH, { role: "enfermera_supervisora" });
    await screen.findByRole("region", { name: /indicadores principales/i });

    const from = screen.getByLabelText("Desde");
    await userEvent.clear(from);
    await userEvent.type(from, "2030-01-01");
    await userEvent.click(screen.getByRole("button", { name: CONSULT }));

    expect(await screen.findByText(/la fecha final no puede ser anterior/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/revise los filtros/i);
    expect(urls).toHaveLength(1);
  });

  it("informa el error de la API sin mostrar indicadores", async () => {
    stubReports(() => jsonResponse(422, { message: "El período no puede superar 90 días." }));
    renderApp(REPORTS_PATH, { role: "enfermera_supervisora" });

    expect(await screen.findByText(/el período no puede superar 90 días/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /indicadores principales/i })).not.toBeInTheDocument();
  });

  it("muestra el enlace a reportes solo a la supervisión de enfermería", () => {
    stubReports();
    renderApp("/", { role: "jefatura_enfermeria" });
    expect(screen.getByRole("link", { name: /^reportes de alertas$/i })).toHaveAttribute("href", REPORTS_PATH);
  });

  it("bloquea la pantalla a la enfermera de piso", () => {
    stubReports();
    renderApp(REPORTS_PATH, { role: "enfermera_piso" });

    expect(screen.queryByRole("link", { name: /^reportes de alertas$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});
