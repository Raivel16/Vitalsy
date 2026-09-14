import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import type { Encounter } from "./domain/encounter";

const luis: Encounter = {
  encounterId: "ENC-0002",
  orderNumber: "OI-2026-0002",
  transferOrderNumber: null,
  patientName: "Luis Ernesto Paredes",
  documentType: "DNI",
  documentNumber: "40112233",
  originService: "Emergencia adultos",
  coverage: { payer: "EsSalud", status: "pendiente", plan: "Regular" },
  location: { room: null, bed: null, service: null },
  wristbandCode: null,
  recordId: null,
  subprocess: "1.1",
  subprocessLabel: "Verificación y registro administrativo",
  currentStep: "cobertura",
  currentStepLabel: "Validar cobertura",
  nextRole: "admision",
  statusLabel: "Cobertura por validar",
  deliverables: [
    { id: "fichaAdmision", label: "Ficha digital de admisión", done: false },
    { id: "brazalete", label: "Brazalete de identificación", done: false },
  ],
};

const ana: Encounter = {
  ...luis,
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: "OT-2026-0001",
  patientName: "Ana María Quispe Rojas",
  documentNumber: "45678912",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: "312", bed: "B", service: "Medicina interna" },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.2",
  subprocessLabel: "Traslado y recepción en piso",
  currentStep: "traslado",
  currentStepLabel: "Consultar orden de traslado",
  nextRole: "celador",
  statusLabel: "Listo para traslado",
  deliverables: [
    { id: "fichaAdmision", label: "Ficha digital de admisión", done: true },
    { id: "brazalete", label: "Brazalete de identificación", done: true },
    { id: "expediente", label: "Expediente clínico electrónico", done: false },
  ],
};

describe("censo de ingresos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lista los pacientes y continúa solo el paso del perfil", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { encounters: [luis, ana] })));
    renderApp("/pacientes");

    expect(await screen.findByRole("link", { name: /Luis Ernesto Paredes/i })).toBeInTheDocument();
    expect(screen.getByText(/2 de 3 entregables listos/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^continuar$/i })).toHaveAttribute("href", "/admision/cobertura?ingreso=ENC-0002");
    expect(screen.getByText(/en curso con celador/i)).toBeInTheDocument();
    expect(screen.queryByText(/RF-\d+/)).not.toBeInTheDocument();
  });

  it("abre la ficha con el estado de cada entregable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { encounter: ana })));
    renderApp("/pacientes/ENC-0001", { role: "celador" });

    expect(await screen.findByRole("heading", { name: /Ana María Quispe Rojas/i })).toBeInTheDocument();
    expect(screen.getByText("Ficha digital de admisión").closest("li")).toHaveTextContent("Listo");
    expect(screen.getByText("Expediente clínico electrónico").closest("li")).toHaveTextContent("Pendiente");
    expect(screen.getByRole("link", { name: /consultar orden de traslado/i })).toHaveAttribute("href", "/traslado/orden?ingreso=ENC-0001");
  });

  it("confirma el paso vigente y envía el estado de cobertura del paciente", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { encounter: luis }))
      .mockResolvedValueOnce(jsonResponse(200, {
        encounter: {
          ...luis,
          currentStep: "brazalete",
          currentStepLabel: "Emitir brazalete",
          nextRole: "admision",
          statusLabel: "Brazalete por emitir",
          coverage: { ...luis.coverage, status: "aprobada" },
        },
      }));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/admision/cobertura?ingreso=ENC-0002");

    await screen.findByRole("button", { name: /confirmar paso en el censo/i });
    await user.selectOptions(screen.getByLabelText(/estado de cobertura/i), "aprobada");
    await user.click(screen.getByRole("button", { name: /confirmar paso en el censo/i }));
    expect(await screen.findByText(/paso registrado/i)).toBeInTheDocument();
    await waitFor(() => {
      const advanceCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/advance"));
      expect(advanceCall?.[1]).toEqual(expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ step: "cobertura", coverageStatus: "aprobada" }),
      }));
    });
  });

  it("abre cobertura al continuar un caso en derivación, no salta el paso de aprobar", async () => {
    const waiting: Encounter = {
      ...luis,
      encounterId: "ENC-0003",
      patientName: "Carmen Yolanda Vega",
      currentStep: "derivacion",
      currentStepLabel: "Esperar regularización de cobertura",
      nextRole: null,
      statusLabel: "En trámite de cobertura",
      coverage: { payer: "Particular", status: "rechazada", plan: "Sin cobertura vigente" },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { encounters: [waiting, luis] })));
    renderApp("/pacientes");

    const buttons = await screen.findAllByRole("link", { name: /^continuar$/i });
    expect(buttons.some((item) => item.getAttribute("href") === "/admision/cobertura?ingreso=ENC-0003")).toBe(true);
    expect(buttons.some((item) => item.getAttribute("href") === "/admision/cobertura?ingreso=ENC-0002")).toBe(true);
  });
});
