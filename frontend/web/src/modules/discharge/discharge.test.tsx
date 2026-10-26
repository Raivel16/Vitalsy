import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import type { DischargeCase } from "./domain/discharge";

vi.mock("../../shared/ui/BarcodeScanner", () => ({
  BarcodeScanner: ({ onScan, label }: { onScan: (code: string) => void; label?: string }) => (
    <button type="button" onClick={() => onScan("BRZ-HOSP")}>{label ?? "Escanear brazalete"}</button>
  ),
}));

const baseCase: DischargeCase = {
  encounterId: "ENC-ALTA-0001",
  patientName: "Paciente de Alta Demo",
  location: "Habitación 401, lecho A",
  nextAction: "order",
  deliverables: [
    { id: "order", label: "Orden de alta", done: false },
    { id: "epicrisis", label: "Epicrisis", done: false },
    { id: "social", label: "Valoración social", done: false },
  ],
  order: null,
  epicrisis: null,
  prescriptions: null,
  socialAssessment: null,
  reconciliation: null,
  nursingReport: null,
  indicationReceipt: null,
  account: null,
  exitPass: null,
  exit: null,
};

function stubDischarge(onCall?: (url: string, init?: RequestInit) => unknown) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });

      const custom = onCall?.(url, init);
      if (custom) return custom;

      if (url.includes("/clinical-alerts/inbox")) {
        return jsonResponse(200, { alerts: [], pending: 0 });
      }
      if (url.includes("/discharge/board") || url.includes("/authorized-exits")) {
        return jsonResponse(200, { cases: [{ ...baseCase, order: { status: "registrada", orderedAt: "2026-09-26T10:00:00+00:00" }, nextAction: "social" }] });
      }
      if (url.includes("/discharge/encounters/ENC-ALTA-0001") && (init?.method ?? "GET") === "GET") {
        return jsonResponse(200, { case: baseCase });
      }
      return jsonResponse(200, {});
    }),
  );

  return calls;
}

describe("alta y egreso (RF-54 a RF-67)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("lista los egresos pendientes para trabajo social", async () => {
    stubDischarge();
    renderApp("/egreso", { role: "trabajo_social" });

    expect(await screen.findByRole("heading", { name: /pacientes en proceso de alta/i })).toBeInTheDocument();
    expect(screen.getByText(/paciente de alta demo/i)).toBeInTheDocument();
    expect(screen.getByText(/registrar valoración social/i)).toBeInTheDocument();
  });

  it("abre la ficha al escanear el brazalete de un hospitalizado", async () => {
    stubDischarge((url) => {
      if (url.includes("/hospital-admission/encounters")) {
        return jsonResponse(200, {
          encounters: [{
            encounterId: "ENC-HOSP",
            patientName: "Raivel",
            documentType: "DNI",
            documentNumber: "0056",
            wristbandCode: "BRZ-HOSP",
            currentStep: "cerrado",
            location: { room: "304", bed: "B", service: "Medicina interna" },
          }],
        });
      }
      if (url.includes("/discharge/encounters/ENC-HOSP")) {
        return jsonResponse(200, { case: { ...baseCase, encounterId: "ENC-HOSP", patientName: "Raivel" } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp("/egreso", { role: "medico_tratante" });

    await user.click(await screen.findByRole("button", { name: /escanear brazalete/i }));

    expect(await screen.findByRole("heading", { name: /raivel/i })).toBeInTheDocument();
  });

  it("busca al paciente hospitalizado en el servidor aunque no esté en la primera página del censo", async () => {
    const inpatient = (id: string, name: string) => ({
      encounterId: id, patientName: name, documentType: "DNI", documentNumber: "10000000", currentStep: "cerrado",
      location: { room: "401", bed: "A", service: "Medicina" }, wristbandCode: `BRZ-${id}`,
    });
    const calls = stubDischarge((url) => {
      if (url.includes("/hospital-admission/encounters")) {
        const term = new URL(url, "http://localhost").searchParams.get("q");
        return jsonResponse(200, {
          encounters: term === "ENC-0099" ? [inpatient("ENC-0099", "Paciente Lejano")] : [inpatient("ENC-0001", "Paciente Primero")],
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp("/egreso", { role: "medico_tratante" });

    await user.type(await screen.findByLabelText(/buscar paciente hospitalizado/i), "ENC-0099");
    await user.click(screen.getByRole("button", { name: /^buscar$/i }));

    expect(await screen.findByText("Paciente Lejano")).toBeInTheDocument();
    expect(screen.queryByText("Paciente Primero")).not.toBeInTheDocument();
    expect(calls.some((call) => call.url.includes("q=ENC-0099"))).toBe(true);
  });

  it("al escanear un brazalete fuera de la primera página del censo lo busca en el servidor", async () => {
    const stranger = { encounterId: "ENC-0001", patientName: "Paciente Primero", documentType: "DNI", documentNumber: "1", wristbandCode: "BRZ-0001", currentStep: "cerrado", location: { room: "1", bed: "A", service: "M" } };
    const target = { encounterId: "ENC-HOSP", patientName: "Raivel", documentType: "DNI", documentNumber: "0056", wristbandCode: "BRZ-HOSP", currentStep: "cerrado", location: { room: "304", bed: "B", service: "Medicina interna" } };
    stubDischarge((url) => {
      if (url.includes("/hospital-admission/encounters")) {
        const term = new URL(url, "http://localhost").searchParams.get("q");
        return jsonResponse(200, { encounters: term === "BRZ-HOSP" ? [target] : [stranger] });
      }
      if (url.includes("/discharge/encounters/ENC-HOSP")) {
        return jsonResponse(200, { case: { ...baseCase, encounterId: "ENC-HOSP", patientName: "Raivel" } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp("/egreso", { role: "medico_tratante" });

    await user.click(await screen.findByRole("button", { name: /escanear brazalete/i }));

    expect(await screen.findByRole("heading", { name: /raivel/i })).toBeInTheDocument();
  });

  it("permite al médico tratante registrar la orden de alta", async () => {
    const calls = stubDischarge((url, init) => {
      if (url.includes("/order") && init?.method === "POST") {
        return jsonResponse(201, {
          case: {
            ...baseCase,
            order: { status: "registrada", orderedAt: "2026-09-26T10:00:00+00:00" },
            nextAction: "epicrisis",
            deliverables: [{ id: "order", label: "Orden de alta", done: true }],
          },
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "medico_tratante" });

    await user.click(await screen.findByRole("button", { name: /registrar orden de alta/i }));

    expect(calls.some((call) => call.method === "POST" && call.url.includes("/order"))).toBe(true);
    expect(await screen.findByText(/orden digital de alta registrada/i)).toBeInTheDocument();
  });

  it("bloquea el módulo a un perfil ajeno", async () => {
    renderApp("/egreso", { role: "admision" });

    expect(await screen.findByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});
