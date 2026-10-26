import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const atOrder = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: null, bed: null, service: null },
  wristbandCode: null,
  recordId: null,
  subprocess: "1.1",
  subprocessLabel: "Verificación y registro administrativo",
  currentStep: "orden",
  currentStepLabel: "Confirmar orden",
  nextRole: "admision",
  statusLabel: "Orden por confirmar",
  deliverables: [],
  progress: [{ id: "orden", label: "Confirmar orden", state: "current" }],
};

const orderPayload = {
  order: {
    orderNumber: "OI-2026-0001",
    originService: "Emergencia adultos",
    requestingPhysician: "Dr. Salas",
    reason: "Disnea",
    patient: { fullName: "Ana María Quispe Rojas", documentType: "DNI", documentNumber: "45678912" },
    coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  },
};

describe("orden de internamiento (RF-02)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "admision");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("mantiene visible «Orden confirmada.» aunque el ingreso avance de paso", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admission-orders/")) return jsonResponse(200, orderPayload);
      if (url.endsWith("/advance") && init?.method === "POST") {
        return jsonResponse(200, { encounter: { ...atOrder, currentStep: "filiacion", currentStepLabel: "Validar filiación" } });
      }
      return jsonResponse(200, { encounter: atOrder });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/admision/orden?ingreso=ENC-0001");
    await user.click(await screen.findByRole("button", { name: /consultar orden/i }));
    await user.click(await screen.findByRole("button", { name: /confirmar orden/i }));

    expect(await screen.findByText("Orden confirmada.")).toBeInTheDocument();
    // Tras el avance de paso el aviso no debe desaparecer.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.getByText("Orden confirmada.")).toBeInTheDocument();
  });
});
