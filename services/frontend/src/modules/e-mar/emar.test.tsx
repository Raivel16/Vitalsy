import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

vi.mock("../../shared/ui/BarcodeScanner", () => ({
  BarcodeScanner: ({ onScan, label }: { onScan: (code: string) => void; label?: string }) => (
    <button type="button" onClick={() => onScan("SCANNED")}>{label ?? "Escanear"}</button>
  ),
}));

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-EMAR-1",
  transferOrderNumber: null,
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-EMAR-0001",
  recordId: "EXP-EMAR-0001",
  subprocess: "2.3",
  subprocessLabel: "e-MAR",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("e-MAR (RF-28–31)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("lista dosis y administra tras verificar códigos sin precarga", async () => {
    const user = userEvent.setup();
    let administered = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/administer") && init?.method === "POST") {
          administered = true;
          return jsonResponse(200, { dose: { id: 1, status: "administrado", barcodeOk: true } });
        }
        if (url.includes("/emar")) {
          return jsonResponse(200, {
            hasActivePrescription: true,
            shiftStart: "2026-09-21T07:00:00+00:00",
            shiftEnd: "2026-09-21T19:00:00+00:00",
            doses: administered
              ? [{ id: 1, drugName: "Paracetamol", dose: "1 g", route: "VO", status: "administrado", scheduledAt: "2026-09-21T14:00:00+00:00", expectedPatientBarcode: "BRZ-EMAR-0001", expectedDrugBarcode: "DRUG-PARACETAMOL-1G" }]
              : [{ id: 1, drugName: "Paracetamol", dose: "1 g", route: "VO", status: "pendiente", scheduledAt: "2026-09-21T14:00:00+00:00", expectedPatientBarcode: "BRZ-EMAR-0001", expectedDrugBarcode: "DRUG-PARACETAMOL-1G" }],
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/emar?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("heading", { name: /e-mar del turno/i })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /^administrar$/i }));
    expect(screen.getByText(/código esperado del medicamento/i)).toHaveTextContent(/DRUG-PARACETAMOL-1G/i);
    expect(screen.getByRole("button", { name: /escanear brazalete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /escanear medicamento/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código paciente/i)).toHaveValue("");
    await user.type(screen.getByLabelText(/código paciente/i), "BRZ-EMAR-0001");
    await user.type(screen.getByLabelText(/código medicamento/i), "DRUG-PARACETAMOL-1G");
    await user.click(screen.getByRole("button", { name: /confirmar administración/i }));
    expect(await screen.findByRole("status", { name: /resultado de administración/i })).toHaveTextContent(/dosis administrada/i);
  });
});
