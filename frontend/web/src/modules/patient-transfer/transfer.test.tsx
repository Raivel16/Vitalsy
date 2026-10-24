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
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/transfer-orders/")) {
        return jsonResponse(200, {
          transfer: {
            orderNumber: "OT-2026-0001",
            patientName: "Ana María Quispe Rojas",
            room: "312",
            bed: "B",
            service: "Medicina interna",
          },
        });
      }
      if (url.includes("/advance") || (init?.method && init.method !== "GET" && url.includes("/encounters/"))) {
        return jsonResponse(200, {
          encounter: { ...ana, currentStep: "identidad", currentStepLabel: "Verificar identidad", nextRole: "camillero" },
        });
      }
      return jsonResponse(200, { encounter: ana });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/traslado/orden?ingreso=ENC-0001");
    expect(await screen.findByDisplayValue("OT-2026-0001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /consultar traslado/i }));
    expect((await screen.findAllByText(/habitaci.n 312/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/ubicación asignada en destino/i)).toBeInTheDocument();
    expect(screen.getByText(/indicación obligatoria de camillero/i)).toBeInTheDocument();
    expect(screen.getByText(/ruta interna/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /verificar identidad/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar traslado/i }));
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/advance"))).toBe(true);
    expect(screen.getByRole("button", { name: /confirmar traslado/i })).toBeDisabled();
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
        encounter: { ...ana, currentStep: "recepcion", currentStepLabel: "Confirmar recepción en piso", nextRole: "enfermera_piso" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/traslado/identidad?ingreso=ENC-0001");
    await screen.findByDisplayValue("BRZ-0001-ANA");
    expect(screen.getByRole("heading", { name: /lector óptico listo/i })).toBeInTheDocument();
    expect(document.querySelector(".scan-panel.identity-verify")).toBeInTheDocument();
    expect(document.querySelector(".scan-panel-form")).toBeInTheDocument();
    expect(screen.getByText(/protocolo de seguridad del paciente/i)).toBeInTheDocument();
    expect(screen.getByText(/^origen$/i)).toBeInTheDocument();
    expect(screen.getByText(/^destino$/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /simular escaneo/i }));
    expect(await screen.findByText(/identidad confirmada/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/wristbands/verify"))).toBe(true);
      const verifyCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/wristbands/verify"));
      expect(JSON.parse(String((verifyCall?.[1] as RequestInit).body))).toEqual({ code: "BRZ-0001-ANA", encounterId: "ENC-0001" });
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/advance"))).toBe(true);
    });
    expect(screen.getByRole("button", { name: /verificar brazalete/i })).toBeDisabled();
  });

  it("permite a enfermería confirmar recepción del paciente en curso", async () => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
    const user = userEvent.setup();
    const nursing = {
      ...ana,
      currentStep: "recepcion",
      currentStepLabel: "Confirmar recepción en piso",
      nextRole: "enfermera_piso",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: nursing }))
        .mockResolvedValueOnce(jsonResponse(201, { reception: { status: "ingresado" } }))
        .mockResolvedValueOnce(jsonResponse(200, {
          encounter: { ...nursing, currentStep: "valoracion", nextRole: "enfermera_piso" },
        })),
    );

    renderApp("/piso/recepcion?ingreso=ENC-0001");
    await user.click(await screen.findByRole("button", { name: /confirmar recepción/i }));
    expect(document.querySelector(".nursing-reception")).toBeTruthy();
    expect(await screen.findByRole("status")).toHaveTextContent(/ingresado/i);
  });

  it("permite notificar una reubicación del paciente en curso", async () => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
    const user = userEvent.setup();
    const nursing = {
      ...ana,
      currentStep: "recepcion",
      currentStepLabel: "Confirmar recepción en piso",
      nextRole: "enfermera_piso",
    };
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/beds/available")) {
        return jsonResponse(200, {
          count: 1,
          beds: [{ id: 12, ward: "Medicina interna", room: "314", bedCode: "A", status: "available" }],
        });
      }
      if (url.includes("/relocations") && init?.method === "POST") {
        return jsonResponse(201, { relocation: { status: "notificada", room: "314", bed: "A" } });
      }
      return jsonResponse(200, { encounter: nursing });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/piso/reubicacion?ingreso=ENC-0001");
    await user.selectOptions(await screen.findByLabelText(/motivo de la discrepancia/i), "Cama asignada ocupada");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /habitación 314 · lecho a/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText(/lecho disponible/i), "314|A");
    await user.click(screen.getByRole("button", { name: /notificar reubicación/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/reubicación notificada/i);
    const relocate = fetchMock.mock.calls.find((call) => String(call[0]).includes("/relocations"));
    expect(JSON.parse(String(relocate?.[1]?.body))).toMatchObject({
      requestedRoom: "314",
      requestedBed: "A",
      reason: "Cama asignada ocupada",
    });
  });
});
