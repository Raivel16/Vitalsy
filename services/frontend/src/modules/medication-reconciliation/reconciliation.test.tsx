import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("conciliación farmacéutica de ingreso", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra dosis, vía y una alerta de alergia, y distingue el estado", async () => {
    const user = userEvent.setup();
    const encounter = {
      encounterId: "ENC-0001",
      orderNumber: "OI-1",
      transferOrderNumber: null,
      patientName: "Ana",
      documentType: "DNI",
      documentNumber: "1",
      originService: "E",
      coverage: { payer: "SIS", status: "aprobada", plan: "SIS" },
      location: { room: null, bed: null, service: null },
      wristbandCode: null,
      recordId: null,
      subprocess: "1.3",
      subprocessLabel: "x",
      currentStep: "conciliacion",
      currentStepLabel: "Conciliación",
      nextRole: "enfermeria",
      statusLabel: "Conciliación",
      deliverables: [],
      progress: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter }))
        .mockResolvedValueOnce(jsonResponse(201, {
          reconciliation: { status: "con_observaciones", statusLabel: "Con observaciones" },
        }))
        .mockResolvedValueOnce(jsonResponse(200, {
          encounter: { ...encounter, currentStep: "escalas", nextRole: "enfermeria" },
        })),
    );
    renderApp("/enfermeria/conciliacion?ingreso=ENC-0001");

    await screen.findByLabelText(/alergias conocidas/i);
    await user.type(screen.getByLabelText(/alergias conocidas/i), "Penicilina");
    await user.type(screen.getByLabelText(/^medicamento$/i), "Amoxicilina");
    await user.type(screen.getByLabelText(/dosis/i), "500 mg");
    await user.type(screen.getByLabelText(/frecuencia/i), "cada 8 horas");
    await user.selectOptions(screen.getByLabelText(/vía/i), "oral");
    await user.click(screen.getByRole("button", { name: /agregar medicamento/i }));

    expect(screen.getByRole("cell", { name: "500 mg" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /oral/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/posible alergia/i);
    expect(screen.getByRole("status", { name: /estado de conciliación/i })).toHaveTextContent(/con observaciones/i);

    await user.click(screen.getByRole("button", { name: /registrar conciliación/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/con observaciones/i);
  });
});
