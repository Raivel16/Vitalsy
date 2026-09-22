import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

vi.mock("../../shared/ui/BarcodeScanner", () => ({
  BarcodeScanner: ({ onScan }: { onScan: (code: string) => void }) => (
    <button type="button" onClick={() => onScan("BRZ-0001-ANA")}>
      Simular escaneo
    </button>
  ),
}));

const ana = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: "OT-2026-0001",
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: "312", bed: "B", service: "Medicina interna" },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.2",
  subprocessLabel: "Traslado y recepción en piso",
  currentStep: "traslado",
  currentStepLabel: "Consultar orden de traslado",
  nextRole: "camillero",
  statusLabel: "Listo para traslado",
  deliverables: [],
  progress: [
    { id: "traslado", label: "Consultar orden de traslado", state: "current" },
    { id: "identidad", label: "Verificar identidad", state: "pending" },
  ],
};

describe("traslado y recepción en piso", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "camillero");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("pide abrir un paciente cuando no hay ingreso en curso", async () => {
    renderApp("/traslado/orden");
    expect(await screen.findByText(/abra un paciente desde el censo/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /orden de traslado/i })).not.toBeInTheDocument();
  });

  it("consulta el traslado del paciente y confirma el paso sin enlaces sueltos", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { encounter: ana }))
      .mockResolvedValueOnce(jsonResponse(200, {
        transfer: {
          orderNumber: "OT-2026-0001",
          patientName: "Ana María Quispe Rojas",
          room: "312",
          bed: "B",
          service: "Medicina interna",
        },
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        encounter: { ...ana, currentStep: "identidad", currentStepLabel: "Verificar identidad", nextRole: "camillero" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/traslado/orden?ingreso=ENC-0001");
    expect(await screen.findByDisplayValue("OT-2026-0001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /consultar traslado/i }));
    expect(await screen.findByText(/habitación 312/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /verificar identidad/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar traslado/i }));
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/advance"))).toBe(true);
  });

  it("rechaza un brazalete que no coincide con el paciente", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: { ...ana, currentStep: "identidad", wristbandCode: "BRZ-0001-ANA" } }))
        .mockResolvedValueOnce(jsonResponse(422, { message: "El código no corresponde al paciente." })),
    );

    renderApp("/traslado/identidad?ingreso=ENC-0001");
    await screen.findByDisplayValue("BRZ-0001-ANA");
    await user.clear(screen.getByLabelText(/código del brazalete/i));
    await user.type(screen.getByLabelText(/código del brazalete/i), "BRZ-MALO");
    await user.click(screen.getByRole("button", { name: /verificar brazalete/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no corresponde/i);
  });

  it("valida el brazalete automáticamente al escanearlo", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { encounter: { ...ana, currentStep: "identidad", wristbandCode: "BRZ-0001-ANA" } }))
      .mockResolvedValueOnce(jsonResponse(200, { identity: { patientName: "Ana María Quispe Rojas", code: "BRZ-0001-ANA" } }))
      .mockResolvedValueOnce(jsonResponse(200, {
        encounter: { ...ana, currentStep: "recepcion", currentStepLabel: "Confirmar recepción en piso", nextRole: "enfermeria" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/traslado/identidad?ingreso=ENC-0001");
    await screen.findByDisplayValue("BRZ-0001-ANA");
    await user.click(screen.getByRole("button", { name: /simular escaneo/i }));
    expect(await screen.findByText(/identidad confirmada/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/wristbands/verify"))).toBe(true);
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/advance"))).toBe(true);
    });
  });

  it("permite a enfermería confirmar recepción del paciente en curso", async () => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
    const user = userEvent.setup();
    const nursing = {
      ...ana,
      currentStep: "recepcion",
      currentStepLabel: "Confirmar recepción en piso",
      nextRole: "enfermeria",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: nursing }))
        .mockResolvedValueOnce(jsonResponse(201, { reception: { status: "ingresado" } }))
        .mockResolvedValueOnce(jsonResponse(200, {
          encounter: { ...nursing, currentStep: "valoracion", nextRole: "enfermeria" },
        })),
    );

    renderApp("/piso/recepcion?ingreso=ENC-0001");
    await user.click(await screen.findByRole("button", { name: /confirmar recepción/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/ingresado/i);
  });

  it("permite notificar una reubicación del paciente en curso", async () => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
    const user = userEvent.setup();
    const nursing = {
      ...ana,
      currentStep: "recepcion",
      currentStepLabel: "Confirmar recepción en piso",
      nextRole: "enfermeria",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: nursing }))
        .mockResolvedValueOnce(jsonResponse(201, {
          relocation: { status: "notificada", room: "314", bed: "A" },
        })),
    );

    renderApp("/piso/reubicacion?ingreso=ENC-0001");
    await user.type(await screen.findByLabelText(/motivo de la discrepancia/i), "El lecho B está ocupado");
    await user.type(screen.getByLabelText(/habitación solicitada/i), "314");
    await user.type(screen.getByLabelText(/lecho solicitado/i), "A");
    await user.click(screen.getByRole("button", { name: /notificar reubicación/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/reubicación notificada/i);
  });
});
