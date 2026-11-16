import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { vi } from "vitest";
import { jsonResponse } from "../../test/renderApp";
import { VitalSignsChartPanel } from "./ui/VitalSignsChartPanel";

// RF-27: el panel de gráfica evolutiva que comparten enfermería y médicos (origen de las alertas NEWS2).
const reading = { recordedAt: "2026-09-21T10:00:00+00:00", pulse: 118, respiratoryRate: 26, oxygenSaturation: 90, news2: 8 };
const partial = { recordedAt: "2026-09-21T14:00:00+00:00", pulse: null, respiratoryRate: null, oxygenSaturation: null, news2: null };

function serveChart(response: () => Promise<unknown>) {
  const fetcher = vi.fn((input: RequestInfo) => (String(input).includes("/vital-signs/chart") ? response() : Promise.reject(new Error("URL inesperada"))));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("panel de gráfica evolutiva (RF-27)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("muestra la gráfica y el historial, con guion para los valores no registrados", async () => {
    const fetcher = serveChart(async () => jsonResponse(200, { series: [reading, partial] }));
    render(<VitalSignsChartPanel encounterId="ENC 1/2" />);

    const table = await screen.findByRole("table", { name: "Historial del rango" });
    expect(String(fetcher.mock.calls[0][0])).toContain("/encounters/ENC%201%2F2/vital-signs/chart");
    const rows = table.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("118");
    expect(rows[0]).toHaveTextContent("26");
    expect(rows[0]).toHaveTextContent("90");
    expect(rows[0]).toHaveTextContent("8");
    expect(rows[1].querySelectorAll("td")[1]).toHaveTextContent("—");
    expect(rows[1].querySelectorAll("td")[4]).toHaveTextContent("—");
  });

  it("oculta el historial cuando solo se pide la gráfica", async () => {
    serveChart(async () => jsonResponse(200, { series: [reading] }));
    render(<VitalSignsChartPanel encounterId="ENC-1" showTable={false} />);

    await waitForElementToBeRemoved(() => screen.queryByText("Cargando gráfica evolutiva…"));
    expect(screen.getByRole("region", { name: "Gráfica evolutiva" })).toBeInTheDocument();
    expect(screen.queryByText("No hay lecturas para graficar en el rango seleccionado.")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("avisa cuando no hay lecturas en el rango", async () => {
    serveChart(async () => jsonResponse(200, { series: [] }));
    render(<VitalSignsChartPanel encounterId="ENC-1" />);

    expect(await screen.findByText("No hay lecturas para graficar en el rango seleccionado.")).toBeInTheDocument();
  });

  it("informa el error si la gráfica no se puede cargar", async () => {
    serveChart(async () => jsonResponse(500, { message: "Error" }));
    render(<VitalSignsChartPanel encounterId="ENC-1" />);

    expect(await screen.findByText("No se pudo cargar la gráfica de signos vitales.")).toBeInTheDocument();
    expect(screen.queryByText("Cargando gráfica evolutiva…")).not.toBeInTheDocument();
  });
});
