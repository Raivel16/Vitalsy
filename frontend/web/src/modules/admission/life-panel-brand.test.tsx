import { screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const atConsent = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: null, bed: null, service: null },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.2",
  subprocessLabel: "Consentimiento",
  currentStep: "consentimiento",
  currentStepLabel: "Firmar consentimiento",
  nextRole: "admision",
  statusLabel: "Consentimiento por firmar",
  deliverables: [],
  progress: [],
};

describe("panel Vitalsy Life del consentimiento (RNF-16)", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra el wordmark Vitalsy + Life como título accesible del panel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { encounter: atConsent })));
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    const region = await screen.findByRole("region", { name: /vitalsy life/i });
    expect(within(region).getByText("Life").className).toContain("life-wordmark-pill");
    expect(region.querySelector(".life-panel-icon")).toBeNull();
  });
});
