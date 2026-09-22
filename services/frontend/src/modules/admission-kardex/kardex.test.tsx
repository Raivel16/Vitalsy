import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: "OT-2026-0001",
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS" },
  location: { room: "312", bed: "B", service: "Medicina" },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.3",
  subprocessLabel: "Valoración",
  currentStep: "kardex",
  currentStepLabel: "Kardex",
  nextRole: "enfermera_piso",
  statusLabel: "Kardex por revisar",
  deliverables: [],
  progress: [],
};

describe("kardex de ingreso", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("resume valoración, medicamentos, alergias, constantes y riesgos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter }))
        .mockResolvedValueOnce(jsonResponse(200, {
          kardex: {
            patientName: "Ana María Quispe Rojas",
            assessment: "Disnea de dos días",
            allergies: ["Penicilina"],
            medications: ["Amoxicilina 500 mg cada 8 horas"],
            vitals: "FR 16, SpO2 98 %, PA 120, pulso 72, 36.8 °C",
            news2: "0 puntos, riesgo bajo",
            fallRisk: "Riesgo alto de caídas, 45 puntos",
            pressureRisk: "Riesgo leve de úlceras por presión, 18 puntos",
          },
        })),
    );

    renderApp("/enfermeria/kardex?ingreso=ENC-0001");

    expect(await screen.findByRole("heading", { name: /kardex electrónico de ingreso/i })).toBeInTheDocument();
    expect(screen.getByText(/disnea de dos días/i)).toBeInTheDocument();
    expect(screen.getByText(/penicilina/i)).toBeInTheDocument();
    expect(screen.getByText(/amoxicilina 500 mg/i)).toBeInTheDocument();
    expect(screen.getByText(/36.8/)).toBeInTheDocument();
    expect(screen.getByText(/riesgo alto de caídas/i)).toBeInTheDocument();
  });

  it("anuncia un error si el kardex no puede cargarse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter }))
        .mockResolvedValueOnce(jsonResponse(404, { message: "Kardex no disponible." })),
    );
    renderApp("/enfermeria/kardex?ingreso=ENC-0001");
    expect(await screen.findByRole("alert")).toHaveTextContent(/kardex no disponible/i);
  });
});
