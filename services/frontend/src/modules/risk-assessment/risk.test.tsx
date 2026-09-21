import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("escalas de riesgo", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("calcula Morse y Braden y muestra el nivel con una recomendación escrita", async () => {
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
      currentStep: "escalas",
      currentStepLabel: "Escalas",
      nextRole: "enfermeria",
      statusLabel: "Escalas",
      deliverables: [],
      progress: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter }))
        .mockResolvedValueOnce(jsonResponse(201, { status: "registrada" }))
        .mockResolvedValueOnce(jsonResponse(200, {
          encounter: { ...encounter, currentStep: "kardex", nextRole: "enfermeria" },
        })),
    );
    renderApp("/enfermeria/riesgos?ingreso=ENC-0001");

    await screen.findByLabelText(/antecedente de caídas: sí/i);
    await user.click(screen.getByLabelText(/antecedente de caídas: sí/i));
    await user.click(screen.getByLabelText(/marcha: alterada/i));
    expect(screen.getByRole("status", { name: /resultado de caídas/i })).toHaveTextContent(/riesgo alto de caídas/i);
    expect(screen.getByRole("status", { name: /resultado de caídas/i })).toHaveTextContent(/acompañ/i);

    await user.selectOptions(screen.getByLabelText(/percepción sensorial/i), "1");
    await user.selectOptions(screen.getByLabelText(/^humedad$/i), "1");
    await user.selectOptions(screen.getByLabelText(/^actividad$/i), "1");
    await user.selectOptions(screen.getByLabelText(/^movilidad$/i), "1");
    await user.selectOptions(screen.getByLabelText(/^nutrición$/i), "1");
    await user.selectOptions(screen.getByLabelText(/fricción/i), "1");
    expect(screen.getByRole("status", { name: /resultado de úlceras/i })).toHaveTextContent(/riesgo muy alto/i);
    expect(screen.getByRole("status", { name: /resultado de úlceras/i })).toHaveTextContent(/cambios posturales/i);

    await user.click(screen.getByRole("button", { name: /registrar escalas/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/escalas registradas/i);
  });
});
