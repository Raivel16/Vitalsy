import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
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
  currentStep: "indicaciones",
  currentStepLabel: "Indicaciones",
  nextRole: "medico_residente",
  statusLabel: "Indicaciones por firmar",
  deliverables: [],
  progress: [],
};

describe("indicaciones médicas basales", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_residente");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra el documento pendiente y exige la confirmación para firmar", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter }))
        .mockResolvedValueOnce(jsonResponse(200, {
          orders: {
            status: "pendiente",
            statusLabel: "Pendiente de firma",
            items: ["Reposo relativo", "Oxígeno si SpO2 menor de 92 %"],
          },
        }))
        .mockResolvedValueOnce(jsonResponse(201, {
          signature: { status: "firmado", physicianName: "Dr. Mateo Salas" },
        }))
        .mockResolvedValueOnce(jsonResponse(200, {
          encounter: { ...encounter, currentStep: "cerrado", nextRole: null, statusLabel: "Ingreso cerrado" },
        })),
    );

    renderApp("/medico/indicaciones?ingreso=ENC-0001");
    expect(await screen.findByRole("status", { name: /estado del documento/i })).toHaveTextContent(/pendiente de firma/i);
    expect(screen.getByText(/reposo relativo/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));
    expect(screen.getByLabelText(/nombre del médico/i)).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText(/nombre del médico/i), "Dr. Mateo Salas");
    await user.type(screen.getByLabelText(/colegiatura/i), "CMP 12345");
    await user.click(screen.getByLabelText(/confirmo la firma de las indicaciones/i));
    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));

    expect(await screen.findByRole("status", { name: /estado del documento/i })).toHaveTextContent(/firmado/i);
  });
});
