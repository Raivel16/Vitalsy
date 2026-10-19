import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: "312", bed: "B", service: "Medicina interna" },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.3",
  subprocessLabel: "Valoración",
  currentStep: "valoracion",
  currentStepLabel: "Registrar valoración inicial",
  nextRole: "enfermera_piso",
  statusLabel: "Valoración por registrar",
  deliverables: [],
  progress: [],
};

function stubFetch(baseline: unknown) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
    if (String(input).includes("/life-baseline")) return jsonResponse(200, { baseline });
    return jsonResponse(200, { encounter });
  }));
}

describe("valoración con línea de base de Vitalsy Life (RF-18)", () => {
  beforeEach(() => sessionStorage.setItem("vitalsy-role", "enfermera_piso"));
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra una fila por métrica con su rango personal", async () => {
    stubFetch({
      importedAt: "2026-10-11T10:00:00+00:00",
      metrics: [
        { kind: "heart_rate", low: 58, high: 92, days: 14 },
        { kind: "spo2", low: 95, high: 99, days: 14 },
      ],
    });
    renderApp("/enfermeria/valoracion?ingreso=ENC-0001");
    expect(await screen.findByText("Pulso")).toBeInTheDocument();
    expect(screen.getByText("58–92 lpm")).toBeInTheDocument();
    expect(screen.getByText("SpO₂")).toBeInTheDocument();
    expect(screen.getByText("95–99 %")).toBeInTheDocument();
    expect(screen.queryByText(/aún no hay línea de base importada/i)).not.toBeInTheDocument();
  });

  it("mantiene el texto de respaldo cuando no hay línea de base", async () => {
    stubFetch(null);
    renderApp("/enfermeria/valoracion?ingreso=ENC-0001");
    expect(await screen.findByText("Aún no hay línea de base importada de Vitalsy Life.")).toBeInTheDocument();
  });
});
