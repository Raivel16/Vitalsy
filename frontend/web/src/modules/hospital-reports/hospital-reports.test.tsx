import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import {
  buildHospitalQuery,
  defaultHospitalFilters,
  formatHours,
  validateHospitalFilters,
  type HospitalReport,
} from "./domain/indicators";

const REPORTS_PATH = "/reportes/hospital";
const REPORTS_API = "/api/v1/reports/hospital?";
const CONSULT = /consultar indicadores/i;
const KPIS = /indicadores principales/i;
const LINK = /^indicadores hospitalarios$/i;

const report: HospitalReport = {
  period: { from: "2026-11-03", to: "2026-11-09" },
  filters: { ward: null },
  options: {
    wards: [
      { code: "CIR", name: "Cirugía" },
      { code: "MED", name: "Medicina" },
    ],
  },
  beds: {
    total: 5,
    occupied: 2,
    available: 1,
    cleaning: 1,
    blocked: 1,
    occupancyPercent: 40,
    byWard: [
      { code: "CIR", name: "Cirugía", total: 2, occupied: 0, occupancyPercent: 0 },
      { code: "MED", name: "Medicina", total: 3, occupied: 2, occupancyPercent: 66.7 },
    ],
  },
  flow: {
    admissions: 3,
    discharges: 3,
    averageStayHours: 68,
    daily: [
      { date: "2026-11-04", admissions: 1, discharges: 0 },
      { date: "2026-11-05", admissions: 1, discharges: 1 },
    ],
  },
  turnover: { completed: 2, pending: 1, averageMinutes: 30 },
  alerts: {
    totalAlerts: 2,
    activeAlerts: 2,
    nurseAcknowledgement: { targetMinutes: 5, measured: 2, pending: 0, averageMinutes: 6, withinTargetPercent: 50 },
  },
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
      return jsonResponse(200, {});
    }),
  );
  return urls;
}

describe("dominio del tablero hospitalario (RF-115)", () => {
  it("propone los últimos siete días y todas las salas", () => {
    expect(defaultHospitalFilters(new Date(2026, 10, 9))).toEqual({ from: "2026-11-03", to: "2026-11-09", ward: "" });
  });

  it("valida fechas obligatorias, orden y período máximo", () => {
    const base = defaultHospitalFilters(new Date(2026, 10, 9));
    expect(validateHospitalFilters(base)).toEqual({});
    expect(validateHospitalFilters({ ...base, from: "" })).toEqual({ from: "Indique la fecha inicial." });
    expect(validateHospitalFilters({ ...base, from: "2026-11-10" })).toEqual({
      to: "La fecha final no puede ser anterior a la inicial.",
    });
    expect(validateHospitalFilters({ ...base, from: "2026-01-01" }).from).toMatch(/no puede superar 90 días/i);
  });

  it("arma la consulta solo con la sala elegida", () => {
    const base = defaultHospitalFilters(new Date(2026, 10, 9));
    expect(buildHospitalQuery(base)).toBe("from=2026-11-03&to=2026-11-09");
    expect(buildHospitalQuery({ ...base, ward: "MED" })).toBe("from=2026-11-03&to=2026-11-09&ward=MED");
  });

  it("formatea horas y deja el guion cuando no hay datos", () => {
    expect(formatHours(68)).toBe("68 h");
    expect(formatHours(null)).toBe("—");
  });
});

describe("pantalla de indicadores hospitalarios (RF-115)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("muestra los indicadores, gráficos y la tabla diaria calculados por la API", async () => {
    const urls = stubReports();
    renderApp(REPORTS_PATH, { role: "jefatura_enfermeria" });

    const kpis = await screen.findByRole("region", { name: KPIS });
    expect(within(kpis).getByText("Ocupación de camas")).toBeInTheDocument();
    expect(within(kpis).getByText("40 %")).toBeInTheDocument();
    expect(within(kpis).getByText("68 h")).toBeInTheDocument();
    expect(within(kpis).getByText("30 min")).toBeInTheDocument();
    expect(within(kpis).getByText("50 %")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ocupación por sala/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /estado de las camas/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ingresos y altas por día/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /detalle diario/i })).toHaveTextContent("2026-11-05");
    expect(urls[0]).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByRole("option", { name: "Medicina" })).toBeInTheDocument();
  });

  it("consulta con la sala elegida y confirma la actualización", async () => {
    const urls = stubReports();
    renderApp(REPORTS_PATH, { role: "gestion_camas" });
    await screen.findByRole("region", { name: KPIS });

    await userEvent.selectOptions(screen.getByLabelText("Sala"), "MED");
    await userEvent.click(screen.getByRole("button", { name: CONSULT }));

    expect(await screen.findByText(/indicadores actualizados: 3 ingresos y 3 altas/i)).toBeInTheDocument();
    expect(urls.at(-1)).toContain("ward=MED");
  });

  it("no consulta la API si el rango de fechas es inválido", async () => {
    const urls = stubReports();
    renderApp(REPORTS_PATH, { role: "enfermera_supervisora" });
    await screen.findByRole("region", { name: KPIS });

    const from = screen.getByLabelText("Desde");
    await userEvent.clear(from);
    await userEvent.type(from, "2030-01-01");
    await userEvent.click(screen.getByRole("button", { name: CONSULT }));

    expect(await screen.findByText(/la fecha final no puede ser anterior/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/revise los filtros/i);
    expect(urls).toHaveLength(1);
  });

  it("conserva el aviso de validación aunque la carga inicial termine después", async () => {
    let release: (value: unknown) => void = () => undefined;
    const urls = stubReports(() => new Promise((resolve) => { release = resolve; }));
    renderApp(REPORTS_PATH, { role: "jefatura_enfermeria" });
    await screen.findByText(/calculando indicadores/i);

    await userEvent.clear(screen.getByLabelText("Hasta"));
    fireEvent.submit(screen.getByRole("form", { name: /filtros del tablero/i }));
    expect(await screen.findByText(/indique la fecha final/i)).toBeInTheDocument();

    release(jsonResponse(200, report));
    expect(await screen.findByRole("region", { name: KPIS })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/revise los filtros/i);
    expect(urls).toHaveLength(1);
  });

  it("informa el error de la API sin mostrar indicadores", async () => {
    stubReports(() => jsonResponse(422, { message: "La sala seleccionada no existe." }));
    renderApp(REPORTS_PATH, { role: "jefatura_enfermeria" });

    expect(await screen.findByText(/la sala seleccionada no existe/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: KPIS })).not.toBeInTheDocument();
  });

  it("indica que no hay datos cuando el período no tiene movimientos", async () => {
    stubReports(() =>
      jsonResponse(200, {
        ...report,
        beds: { ...report.beds, total: 0, occupied: 0, occupancyPercent: null, byWard: [] },
        flow: { admissions: 0, discharges: 0, averageStayHours: null, daily: [] },
        turnover: { completed: 0, pending: 0, averageMinutes: null },
      }),
    );
    renderApp(REPORTS_PATH, { role: "jefatura_enfermeria" });

    const kpis = await screen.findByRole("region", { name: KPIS });
    expect(within(kpis).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("muestra el enlace al tablero solo a jefatura, supervisión y gestión de camas", () => {
    stubReports();
    renderApp("/", { role: "gestion_camas" });
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", REPORTS_PATH);
  });

  it("bloquea la pantalla a la enfermera de piso", () => {
    stubReports();
    renderApp(REPORTS_PATH, { role: "enfermera_piso" });

    expect(screen.queryByRole("link", { name: LINK })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});
