import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../../test/renderApp";
import type { Encounter } from "../domain/encounter";

const registered: Encounter = {
  encounterId: "ENC-0009",
  orderNumber: "OI-2026-0009",
  transferOrderNumber: null,
  patientName: "Rosa Elena Huamán",
  documentType: "DNI",
  documentNumber: "41234567",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: null, bed: null, service: null },
  wristbandCode: null,
  recordId: null,
  subprocess: "1.1",
  subprocessLabel: "Verificación y registro administrativo",
  currentStep: "cobertura",
  currentStepLabel: "Validar cobertura",
  nextRole: "admision",
  statusLabel: "Cobertura por validar",
  deliverables: [{ id: "fichaAdmision", label: "Ficha digital de admisión", done: true }],
  progress: [{ id: "cobertura", label: "Validar cobertura", state: "current" }],
};

function isRegistration(call: unknown[]) {
  const init = call[1] as RequestInit | undefined;
  return String(call[0]).endsWith("/api/v1/hospital-admission/encounters") && init?.method === "POST";
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/número de orden/i), "  OI-2026-0009  ");
  await user.type(screen.getByLabelText(/documento de identidad/i), "41234567");
  await user.type(screen.getByLabelText(/nombre del paciente/i), "  Rosa Elena Huamán ");
  await user.type(screen.getByLabelText(/plan de cobertura/i), " SIS Gratuito ");
}

describe("registro manual de ingreso (RF-01)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no promete una solicitud de cama: la cama no se asigna en el registro", async () => {
    renderApp("/pacientes/nuevo");
    await screen.findByLabelText(/número de orden/i);
    expect(screen.queryByText(/solicitud de asignación inmediata/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no asigna ni solicita cama/i)).toBeInTheDocument();
  });

  it("valida antes de enviar y no llama a la API con el formulario vacío", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/pacientes/nuevo");

    await screen.findByLabelText(/número de orden/i);
    await user.click(screen.getByRole("button", { name: /^registrar$/i }));

    expect(screen.getByText(/el número de orden es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/el nombre del paciente es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/el plan de cobertura es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/documento de identidad/i)).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.some(isRegistration)).toBe(false);
  });

  it("registra el ingreso manual con los datos recortados y abre el paso devuelto", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { encounter: registered }));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/pacientes/nuevo");

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /^registrar$/i }));

    await waitFor(() => expect(fetchMock.mock.calls.some(isRegistration)).toBe(true));
    const call = fetchMock.mock.calls.find(isRegistration) as unknown[];
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({
      orderNumber: "OI-2026-0009",
      patientName: "Rosa Elena Huamán",
      documentNumber: "41234567",
      originService: "Emergencia adultos",
      coveragePayer: "SIS",
      coverageStatus: "aprobada",
      coveragePlan: "SIS Gratuito",
      reason: null,
      source: "manual",
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: /^registrar$/i })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("ENC-0009"))).toBe(true);
  });

  it("muestra el error del servidor en español y conserva el formulario", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        url.endsWith("/api/v1/hospital-admission/encounters") && init?.method === "POST"
          ? jsonResponse(422, { message: "La orden ya tiene un ingreso abierto." })
          : jsonResponse(200, {}),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/pacientes/nuevo");

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /^registrar$/i }));

    expect(await screen.findByText(/la orden ya tiene un ingreso abierto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^registrar$/i })).toBeEnabled();
    expect(screen.getByLabelText(/número de orden/i)).toHaveValue("  OI-2026-0009  ");
  });
});
